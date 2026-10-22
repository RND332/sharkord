export type TDiskMetrics = {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  dodecagonUsedSpace: number;
};

export type TPluginStorageUsage = {
  pluginId: string;
  fileCount: number;
  usedSpace: number;
  installed: boolean;
};
