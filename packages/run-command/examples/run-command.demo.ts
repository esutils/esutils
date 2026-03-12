import { RunCommand } from '@esutils/run-command';

async function main() {
  const result = await RunCommand('node', ['-v']);
  console.log('stdout:', result.stdout.toString());
  console.log('stderr:', result.stderr.toString());
  if (result.error) {
    console.error('Error:', result.error);
  }
  console.log('Exit code:', result.code);
}

main().catch((error) => {
  console.error('Error:', error);
});
