# Changelog

## 3.1.0
- New exports for gang resources: `SetGangInfo`, `DisbandGang`, `GetRanks`, `SetGangOwner` and `IsReady`.
- New server event `rsg-society:server:gangUpdated` (name, colour, tag or owner of a gang changed).
- The Settings tab now uses the same code as `SetGangInfo`, so both behave the same.
- rsg-gangs 3.5.0 builds on these: it no longer keeps its own members, ranks or bank.

## 3.0.1
- Fix: job societies (vallaw, medic and so on) were not created and the desk showed "something went wrong". Job data is now read from rsg-core's live job definitions instead of a stale copy of RSGCore.Shared.Jobs.

## 3.0.0
- First release. Replaces rsg-bossmenu and rsg-gangmenu.
- Members, ranks, permissions, bank, payroll (skips an empty account), storage, fines, audit trail, API, import of old data.
