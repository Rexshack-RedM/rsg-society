# rsg-society 3.1.0 – Documentation

## Contents
1. Architecture 2. Data 3. Permissions 4. Payroll 5. Fines 6. Exports 7. Events 8. Commands 9. rsg-core change 10. Migration 11. Security 12. Database 13. Troubleshooting

## 1. Architecture
| File | Purpose |
|---|---|
| `server/database.lua` | `Soc` namespace, builds tables from `install.sql` |
| `server/main.lua` | Access/permission resolution, bank (`Soc.Credit/Debit`), audit, load, public exports |
| `server/members.lua` | Gang and job membership, invites, mirrors gangs into rsg-core |
| `server/finance.lua` | Wages, gang payroll timer, fines |
| `server/callbacks.lua` | NUI callbacks (`open`, `tab`, `act`, `createGang`) |
| `server/migration.lua` | One-time import |
| `server/commands.lua` | Admin commands, desk locations |
| `client/main.lua`, `html/*` | Desks, prompts, blips, NUI |

Jobs: membership stays in rsg-core (multi-job); this resource reads the grade. Gangs: membership lives in `rsg_society_members` and is mirrored to rsg-core with `SetGangs` / `Player.Functions.SetGang`.

## 2. Data
Money is stored in cents (`balance_cents`) and cached in memory; changes are delta SQL updates and a ledger row each. Tables: `rsg_societies`, `rsg_society_ranks`, `rsg_society_perms`, `rsg_society_members`, `rsg_society_ledger`, `rsg_society_audit`, `rsg_society_fines`, `rsg_society_locations`, `rsg_society_meta`.

## 3. Permissions
`members hire fire promote finance deposit withdraw payroll storage fines finevoid audit ranks settings`; gangs also `disband equipment upgrade bounty`. Bosses have all. A rank can only grant permissions its editor holds. Other scripts add their own with `RegisterPermission`.

## 4. Payroll
rsg-core calls `ProcessWage` for each wage. `'paid'`: society debited, core pays the player. `'skipped'`: balance too low, nobody is paid, employee and bosses are notified. `'unmanaged'`: not a society job or payroll off, core pays as before. If core fails to pay after `'paid'`, it calls `RefundWage`. Gangs: `Config.Payroll.GangInterval` minutes, highest rank first, same skip rule.

## 5. Fines
Amount limits in `Config.Fines`. Collected from `PayWith` in order. With `AllowPartial` the rest stays unpaid and is collected on login/payroll. Credited to the society ledger as `fine`.

## 6. Exports (server)
| Export | Returns |
|---|---|
| `GetAccount(name)` / `GetBalance(name)` | balance (dollars); job societies are created on demand |
| `GetGangAccount(name)` | balance |
| `AddMoney(name, amount, reason, actor?)` / `RemoveMoney(...)` (also `AddGangMoney`, `RemoveGangMoney`) | bool (remove fails if balance is too low) |
| `GetSociety(name)`, `GetSocieties(type?)`, `GetPlayerSocieties(id)` | society info |
| `HasPermission(id, name, perm)`, `IsBoss(id, name)` | bool (`id` = server id or citizenid) |
| `GetMembers(name)` | member list |
| `Audit(name, actorCid, action, detail, targetCid)` | writes an audit row |
| `RegisterPermission(perm, gangOnly)` | adds a permission |
| `ProcessWage(src, job, amount)` / `RefundWage(job, amount)` | used by rsg-core |
| `RunPayroll(name)` | runs gang payroll now |
| `IssueFine(src, targetId, name, amount, reason)` | ok, fineId or locale key |
| `GetPlayerGang(id)`, `CreateGang(label, ownerCid)`, `AddMember(name, id, level)`, `RemoveMember(name, id)`, `SetMemberLevel(name, id, level)` | gang API |
| `SetGangInfo(name, { label?, color?, tag? })` -> `ok, reasonKey` | rename, recolour or retag a gang (same rules as the Settings tab; the colour must be one of `Config.Gang.Colors`) |
| `DisbandGang(name)` -> `ok, balance` | deletes a gang; the balance (dollars) is returned, not paid out |
| `GetRanks(name)` -> `{ { level, name, boss } }` | ranks of a society, lowest first |
| `SetGangOwner(name, citizenid)` -> `ok` | changes the recorded owner of a gang (ranks are changed with `SetMemberLevel`) |
| `IsReady()` -> boolean | true once all societies are loaded; other resources wait for it at start |
| `OpenStorage(src, name)` | opens the stash (checks access) |

## 7. Events (server)
`rsg-society:server:ready`, `balanceChanged`, `memberJoined`, `memberLeft`, `rankChanged`, `gangCreated`, `gangDisbanded`, `gangUpdated` (name, label, colour, tag or owner changed), `fineIssued`. Legacy `rsg-bossmenu:client:mainmenu` and `rsg-gangmenu:client:mainmenu` still open the menu.

## 8. Commands
`/society`, `/gang`, `/fines`, `/payfines`; admin: `/addsociety <job>`, `/societydesk <society>`, `/removesocietydesk`, `/societyfunds <society> <add|remove> <amount>`, `/societymigrate`, `/removegang <id>`. Key: rebindable in the game's key settings (`Config.UseKeyMapping`).

## 9. rsg-core change
In `server/functions.lua`, `PaycheckInterval` asks `exports['rsg-society']:ProcessWage` before paying when `RSGConfig.Money.PayCheckSociety = true`, and skips the wage on `'skipped'`. Without rsg-society started, core pays as it always did.

## 10. Migration
On first start (`Config.Migration`): `management_funds` balances, core gangs with members or money, and rsg-gangs data (`rsg_gangs`, `rsg_gang_members`, `rsg_gang_logs`) are imported once; markers in `rsg_society_meta`. Re-run with `/societymigrate`. Static gangs in `shared/gangs.lua` remain but are overridden at runtime.
**rsg-gangs (3.5.0 and newer)** uses these exports and events for gang identity, members, ranks, permissions and the bank, and keeps only its gameplay data (wagon, equipment, turf, bounties...). Start rsg-society before it. The `rsg_gang_members` table is only read by the one-time import.

## 11. Security
All amounts, ranks and targets are validated on the server; distance checks on desks, hiring, fining; per-player cooldown; rank hierarchy enforced (no acting on equal/higher ranks except bosses when `AllowEqualRank`); SQL uses parameters; NUI renders user text with `textContent`.

## 12. Database
Created automatically from `install.sql` (`Config.AutoDatabase`). Manual: import `install.sql`.

## 13. Troubleshooting
| Problem | Fix |
|---|---|
| Wages still paid with empty account | `PayCheckSociety` false, or core patch missing, or society payroll off |
| Menu says system starting | Wait for jobs to load; check console |
| Old balances missing | Check `rsg_society_meta` markers, run `/societymigrate` |

Support: https://rexshack.tebex.store
