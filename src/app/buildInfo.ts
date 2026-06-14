export type BuildInfo = {
  fullCommit: string;
  shortCommit: string;
  dirty: boolean;
  builtAt: string;
};

export const buildInfo: BuildInfo = __BUILD_INFO__;

export function formatBuildVersion(info: BuildInfo = buildInfo): string {
  return `Commit ${info.shortCommit}${info.dirty ? " · lokal verändert" : ""}`;
}

