import { exec } from 'child_process';

export function runCode(language, code) {
  return new Promise((resolve, reject) => {
    if (language !== 'javascript') {
      resolve({ output: 'Only JavaScript is supported in this demo build.' });
      return;
    }

    const command = `node -e ${JSON.stringify(code)}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ output: stderr || error.message });
        return;
      }

      resolve({ output: stdout || '(no output)' });
    });
  });
}
