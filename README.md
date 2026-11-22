# rsg-society 3.0.1

One resource for everything a job or gang organisation needs: members and ranks, permissions, a bank account, payroll, shared storage, fines and a full audit trail, plus an API so other scripts can plug in.

It replaces **rsg-bossmenu** and **rsg-gangmenu** (it `provide`s both names) and becomes the single source of truth for gang membership.

Dependencies: `rsg-core` (3.5.0+), `rsg-inventory`, `oxmysql`. No ox_lib. Full reference: [DOCS.md](DOCS.md).

## Features
- **Jobs and gangs, one model.** Job grades come from rsg-core; gangs get their own editable ranks (name, pay, permissions).
- **Permissions per rank.** Members, hire, fire, promote, finance, deposit, withdraw, payroll, storage, fines, void fines, audit, ranks, settings. Gangs add disband, equipment, upgrade, bounty. Bosses always have everything.
- **Society bank.** Deposit, withdraw, ledger with paging. Balances are kept in cents.
- **Payroll that skips an empty account.** Job wages come out of the society balance through the rsg-core paycheck loop; if the balance cannot cover a wage, that wage is skipped and bosses are told. Gang wages run on a timer in this resource with the same rule.
- **Fines.** Issue to a nearby player, collected from cash then bank (partial payments allowed), also on login and payroll. `/fines`, `/payfines`.
- **Storage.** One shared stash per society through rsg-inventory.
- **Audit trail.** Every action is written to the database (who, what, whom, when).
- **Gangs.** Players found a gang (cost configurable), invite members, set ranks, rename, recolour, transfer leadership, disband.
- **Import.** Balances from `management_funds`, core gangs, and rsg-gangs data are imported once, automatically.
- **NUI** in the leather-and-gold style. Push-to-talk keeps working while it is open.

## Installation
1. Stop and remove `rsg-bossmenu` and `rsg-gangmenu` from `server.cfg`.
2. Copy `rsg-society` into your resources and add `ensure rsg-society` after `rsg-core`, `rsg-inventory` and `oxmysql`.
3. Apply the rsg-core change (see DOCS.md, "rsg-core change") and set `RSGConfig.Money.PayCheckSociety = true`.
4. Start the server. Tables are created automatically. To install manually set `Config.AutoDatabase = false` and import `install.sql`.

## Configuration (`shared/config.lua`)
| Option | Default | Description |
|---|---|---|
| `AutoDatabase` | `true` | Build tables on start. `false` = import `install.sql` yourself |
| `Command` / `GangCommand` | `society` / `gang` | Open the desk menu / your gang menu |
| `Keybind`, `UseKeyMapping`, `GangKey` | `J`, `true`, `''` | Desk prompt key and rebindable key mapping (rebind in the game's key settings) |
| `InteractDistance` / `HireDistance` | `5.0` / `10.0` | Server-side distance checks |
| `MaxTransaction` | `1000000` | Largest single deposit or withdrawal |
| `ActionCooldown` | `750` | ms between menu actions per player |
| `PruneDays` | `90` | Delete old ledger/audit rows (0 = keep) |
| `AllowPushToTalkWhileOpen`, `PushToTalkControls` | `true` | Keep push-to-talk working in the NUI |
| `Payroll.*` | see file | Master switch, gang interval, notices, defaults |
| `Fines.*` | see file | Limits, payment order, partial, collection triggers |
| `Storage.*` | see file | Stash weight and slots |
| `Jobs` | see file | Default permissions per job grade |
| `Gang.*` | see file | Create cost, name/tag limits, member cap, default ranks, colours, disband payout |
| `Migration.*` | see file | What to import on first start |

## Use
- Job: walk to the desk (prompt) or press the key, or `/society`.
- Gang: `/gang`. Without a gang you get the found-a-gang form.
- Admin: `/addsociety`, `/societydesk`, `/removesocietydesk`, `/societyfunds`, `/societymigrate`, `/removegang`.

## Developers
```lua
exports['rsg-society']:AddMoney('vallaw', 250, 'Bounty reward')
exports['rsg-society']:HasPermission(src, 'vallaw', 'withdraw')
exports['rsg-society']:IssueFine(src, targetId, 'vallaw', 50, 'Disturbing the peace')
```

Languages: en, de, el, es, fr, ja, nl, pl, pt-br, ro, ru.

Support: https://rexshack.tebex.store
