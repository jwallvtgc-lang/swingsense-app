import { useEffect, useState } from 'react';
import { getAllTierConfigs, type TierConfig } from '../services/tierConfig';

export function useTierConfigs(): {
  configs: Map<string, TierConfig>;
  loading: boolean;
} {
  const [configs, setConfigs] = useState<Map<string, TierConfig>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTierConfigs().then((map) => {
      setConfigs(map);
      setLoading(false);
    });
  }, []);

  return { configs, loading };
}
