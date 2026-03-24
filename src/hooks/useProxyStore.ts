import { useState, useCallback } from 'react';
import { ProxyRow, ProxyResult, ProxyType } from '../types/proxy';

let nextId = 1;

export function createEmptyProxy(): ProxyRow {
  return {
    id: String(nextId++),
    proxy_type: 'http' as ProxyType,
    host: '',
    port: 0,
    username: null,
    password: null,
  };
}

export function useProxyStore() {
  const [proxies, setProxies] = useState<ProxyRow[]>([]);

  const addProxy = useCallback((proxy?: Partial<ProxyRow>) => {
    const newProxy: ProxyRow = {
      ...createEmptyProxy(),
      ...proxy,
      id: String(nextId++),
    };
    setProxies(prev => [...prev, newProxy]);
    return newProxy.id;
  }, []);

  const addProxies = useCallback((newProxies: Partial<ProxyRow>[]) => {
    const created = newProxies.map(p => ({
      ...createEmptyProxy(),
      ...p,
      id: String(nextId++),
    }));
    setProxies(prev => [...prev, ...created]);
  }, []);

  const updateProxy = useCallback((id: string, updates: Partial<ProxyRow>) => {
    setProxies(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const updateResult = useCallback((result: ProxyResult) => {
    setProxies(prev => prev.map(p =>
      p.id === result.id ? { ...p, result } : p
    ));
  }, []);

  const removeProxy = useCallback((id: string) => {
    setProxies(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setProxies([]);
  }, []);

  const clearResults = useCallback(() => {
    setProxies(prev => prev.map(p => {
      const { result: _, ...rest } = p;
      return rest;
    }));
  }, []);

  return {
    proxies,
    addProxy,
    addProxies,
    updateProxy,
    updateResult,
    removeProxy,
    clearAll,
    clearResults,
  };
}
