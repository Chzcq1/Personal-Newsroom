# Signal Mode System

Sprint 16 introduced **Signal Mode** — a user-controlled knob that governs the balance between _speed_ and _verification_ across every layer of the intelligence pipeline.

## The Problem

INFOX processes signals from dozens of RSS sources in real-time. Not every article is equally trustworthy, timely, or relevant. Two users have very different needs:

| User | Needs |
|------|-------|
| Long-term investor | Verified, confirmed signals only |
| Day trader / analyst | First-mover advantage, early signals |
| General reader | Balance between freshness and accuracy |

A single pipeline setting cannot serve all three. Signal Mode gives users explicit control.

## The Three Modes

### Safe Mode
- **Risk level**: Low  
- **Speed**: Slower  
- **Use case**: Long-term decision-makers, investors, executives

Requires multi-source confirmation before a signal enters the pipeline. Higher latency but lower false-positive rate. Best for users who act on information and need high confidence.

### Balanced (default)
- **Risk level**: Moderate  
- **Speed**: Moderate  
- **Use case**: Most users

The default mode. Balances freshness against reliability. Applies standard noise-filtering rules from the precision filter and signal priority engine.

### Raw Signal
- **Risk level**: High  
- **Speed**: Fastest  
- **Use case**: Traders, analysts, early-mover researchers

Tolerates partial source confirmation. Prioritises emerging, single-source signals. Highest coverage but more noise — requires the user to apply their own judgement.

## What Signal Mode Affects

| System | Effect |
|--------|--------|
| Feed ranking | Priority score thresholds shift per mode |
| Alert engine | Source confirmation requirements |
| Telegram delivery | Article acceptance/rejection criteria |
| Noise suppression | Minimum confidence thresholds |
| Narrative clustering | Maturity stage promotion speed |

## Implementation

**Backend**: `artifacts/api-server/src/services/intelligence/signalModeEngine.ts`  
**Route**: `GET/POST /api/signal-mode`  
**Frontend settings page**: `/settings/signal-mode`  
**Client persistence**: `artifacts/newsroom/src/lib/signalMode.ts` (localStorage key: `ai-newsroom:signal-mode`)

The mode is stored in the backend server process state and also persisted in localStorage on the client. On page load, the client sends a POST to sync any saved preference with the server.

## Extending Signal Mode

To add a new mode:
1. Add the mode constant to `SignalMode` type in `signalModeEngine.ts`
2. Add its configuration to the `SIGNAL_MODE_CONFIGS` map
3. Update validation in `routes/signalMode.ts`
4. Add metadata to `SIGNAL_MODE_META` in `lib/signalMode.ts` on the frontend
