import { spawnSync } from 'child_process'

export default function render(dot: string, filename: string) {
  const { status, stdout, stderr } = spawnSync('dot', ['-Tpng:cairo', '-o', filename], { input: dot })
  return {
    exitCode: status,
    log: stdout.toString(),
    errors: stderr.toString(),
  }
}
