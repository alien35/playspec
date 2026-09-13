export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

export function c(colorKey: keyof typeof colors, text: string): string {
  return `${colors[colorKey]}${text}${colors.reset}`;
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]|\x1b\].*?\x07/g, '');
}

export function printBanner(title: string, subtitle?: string): void {
  const line = '─'.repeat(Math.max(title.length + 4, 50));
  console.log(`\n${c('cyan', '┌' + line + '┐')}`);
  console.log(`${c('cyan', '│')}  ${c('bold', c('brightWhite', title))}${' '.repeat(Math.max(0, line.length - title.length - 2))}${c('cyan', '│')}`);
  if (subtitle) {
    console.log(`${c('cyan', '│')}  ${c('dim', subtitle)}${' '.repeat(Math.max(0, line.length - subtitle.length - 2))}${c('cyan', '│')}`);
  }
  console.log(`${c('cyan', '└' + line + '┘')}\n`);
}

export function badge(status: 'red' | 'green' | 'yellow' | 'blue' | 'gray', label: string): string {
  switch (status) {
    case 'red':
      return `${c('brightRed', '●')} ${c('red', label)}`;
    case 'green':
      return `${c('brightGreen', '●')} ${c('green', label)}`;
    case 'yellow':
      return `${c('brightYellow', '●')} ${c('yellow', label)}`;
    case 'blue':
      return `${c('brightBlue', '●')} ${c('blue', label)}`;
    case 'gray':
    default:
      return `${c('gray', '○')} ${c('gray', label)}`;
  }
}
