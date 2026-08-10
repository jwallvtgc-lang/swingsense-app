import Purchases from 'react-native-purchases';
import type { PurchasesStoreProduct } from 'react-native-purchases';
import { supabase } from '../config/supabase';

const REVENUECAT_API_KEY = 'appl_RFfPcYZxXvnUTUwzhbVvStGoJXg';

// Explicit slot → product ID mapping. Slot 2 uses "slot2b" — never derive programmatically.
const SLOT_PRODUCT_IDS: Record<number, string> = {
  1: 'com.swingsense.silver.slot1',
  2: 'com.swingsense.silver.slot2b',
  3: 'com.swingsense.silver.slot3',
  4: 'com.swingsense.silver.slot4',
};

export function configureRevenueCat(): void {
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
}

export async function loginRevenueCat(accountId: string): Promise<void> {
  try {
    await Purchases.logIn(accountId);
  } catch (e) {
    console.warn('[RevenueCat] logIn failed:', e);
  }
}

export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('[RevenueCat] logOut failed:', e);
  }
}

async function getNextAvailableSlot(accountId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profile_relationships')
    .select('slot_number')
    .eq('account_id', accountId)
    .not('slot_number', 'is', null);

  if (error) throw new Error(`Failed to check slot availability: ${error.message}`);

  const used = new Set((data ?? []).map((r) => r.slot_number as number));
  for (let slot = 1; slot <= 4; slot++) {
    if (!used.has(slot)) return slot;
  }
  throw new Error('All 4 Silver slots are already in use for this account.');
}

export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
  error: Error | null;
}

export async function purchaseSilverForProfile(
  profileId: string,
  accountId: string,
): Promise<PurchaseResult> {
  // 1. Use the existing slot if this profile already has one (re-purchase / restore path).
  const { data: rel } = await supabase
    .from('profile_relationships')
    .select('slot_number')
    .eq('account_id', accountId)
    .eq('profile_id', profileId)
    .single();

  let slotNumber: number;
  if (rel?.slot_number != null) {
    slotNumber = rel.slot_number as number;
  } else {
    try {
      slotNumber = await getNextAvailableSlot(accountId);
    } catch (e) {
      return { success: false, cancelled: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  const productId = SLOT_PRODUCT_IDS[slotNumber];
  if (!productId) {
    return {
      success: false,
      cancelled: false,
      error: new Error(`No product mapped to slot ${slotNumber}`),
    };
  }

  // 2. Fetch the StoreProduct — purchaseStoreProduct is preferred over deprecated purchaseProduct.
  let product: PurchasesStoreProduct;
  try {
    const products = await Purchases.getProducts([productId]);
    if (products.length === 0) {
      return {
        success: false,
        cancelled: false,
        error: new Error(
          `Product ${productId} not found. Check App Store Connect + RevenueCat setup.`,
        ),
      };
    }
    product = products[0];
  } catch (e) {
    return {
      success: false,
      cancelled: false,
      error: e instanceof Error ? e : new Error('Could not load product from the App Store.'),
    };
  }

  // 3. Trigger the native purchase sheet.
  try {
    await Purchases.purchaseStoreProduct(product);
  } catch (e: unknown) {
    const rcErr = e as { userCancelled?: boolean | null; code?: string; message?: string };
    const cancelled =
      rcErr.userCancelled === true ||
      rcErr.code === String(Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
    if (cancelled) {
      return { success: false, cancelled: true, error: null };
    }
    return {
      success: false,
      cancelled: false,
      error: new Error(rcErr.message ?? 'Purchase failed. Please try again.'),
    };
  }

  // 4. Purchase confirmed — atomically write slot assignment + subscription upgrade via RPC.
  //    The Postgres function runs both updates in a single transaction: both succeed or
  //    neither does, so partial state (slot set but tier still 'free', or vice versa) is impossible.
  const { error: rpcError } = await supabase.rpc('complete_silver_purchase', {
    p_account_id: accountId,
    p_profile_id: profileId,
    p_slot_number: slotNumber,
  });

  if (rpcError) {
    console.error('[purchases] complete_silver_purchase failed:', rpcError);
    return {
      success: false,
      cancelled: false,
      error: new Error('Purchase completed but activation failed — contact support.'),
    };
  }

  return { success: true, cancelled: false, error: null };
}
