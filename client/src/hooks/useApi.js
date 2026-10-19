import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';

// Loads data from a GET endpoint and tracks loading / error state.
// Each request is identified by a key built from the path and params. The
// hook is "loading" while the stored result belongs to an older key, so no
// extra state update is needed when a new request starts. An in-flight
// request is aborted when the inputs change or the component unmounts, so a
// slow earlier response can never overwrite a newer one.
export default function useApi(path, params, { enabled = true } = {}) {
  const [version, setVersion] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});
  const requestKey = path && enabled ? `${path}|${paramsKey}|${version}` : null;
  const [result, setResult] = useState({ key: null, data: null, meta: null, error: null });

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    apiGet(path, JSON.parse(paramsKey), { signal: controller.signal })
      .then(({ data, meta }) => setResult({ key: requestKey, data, meta: meta ?? null, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult((prev) => ({ ...prev, key: requestKey, error }));
      });
    return () => controller.abort();
  }, [requestKey, path, paramsKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((updater) => {
    setResult((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater }));
  }, []);

  const current = result.key === requestKey;
  return {
    data: result.data,
    meta: result.meta,
    error: current ? result.error : null,
    loading: requestKey !== null && !current,
    reload,
    setData,
  };
}
