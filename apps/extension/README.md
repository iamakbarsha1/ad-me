# ad-me — Earn from AI Thinking Time

ad-me shows sponsored ads while your AI tools think, turning idle wait time into developer earnings.

## How it works

When AI tools like Claude Code, GitHub Copilot, or Codex CLI are processing your request, ad-me displays a relevant sponsored ad in VS Code. You earn money every time an ad is shown or clicked. Advertisers bid to reach developers at the exact moment they're engaged.

## Supported AI tools

- Claude Code
- GitHub Copilot Chat
- Codex CLI
- Any AI tool that uses VS Code's thinking/loading states

## Ad surfaces

| Surface | Description |
|---------|-------------|
| `spinner_overlay` | Overlay shown during spinner animations |
| `thinking_shimmer` | Shimmer effect panel while AI thinks |
| `status_bar` | Subtle ad in the VS Code status bar |
| `spinner_verb` | Text replacing loading verbs in the status bar |

## Setup

1. Install the extension from VS Code Marketplace
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run **`ad-me: Sign In`**
4. Get your access token from [ad-me web app → Settings](https://ad-me-web.onrender.com/settings) and paste it when prompted
5. Ads start showing automatically — you earn from the first impression

## Commands

| Command | Description |
|---------|-------------|
| `ad-me: Sign In` | Authenticate with your ad-me account |
| `ad-me: Sign Out` | Sign out and stop earning |
| `ad-me: Toggle Ads` | Pause or resume ad display |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ad-me.enabled` | boolean | `true` | Enable or disable ad display |
| `ad-me.surfaces` | array | all surfaces | Which ad surfaces to show |

## Earnings

- Impressions and clicks are tracked automatically
- View your earnings at [ad-me web app](https://ad-me-web.onrender.com)
- Request payouts via UPI or bank transfer once you reach the minimum threshold

## Privacy

ad-me never reads your code. It only detects when AI tools are in a loading/thinking state to trigger ad display timing.
