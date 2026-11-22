'use strict';

const RES = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'rsg-society';

const S = { strings: {}, view: null, tab: 'overview', mode: 'menu' };

/* ---------------------------------------------------------------- helpers */
function t(key, ...args) {
    let s = S.strings[key] !== undefined ? S.strings[key] : key;
    let i = 0;
    return String(s).replace(/%[sd]/g, () => (i < args.length ? args[i++] : ''));
}

function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
        for (const k of Object.keys(props)) {
            const v = props[k];
            if (v === undefined || v === null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'text') el.textContent = v;
            else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'value') el.value = v;
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    for (const kid of kids.flat()) {
        if (kid === undefined || kid === null || kid === false) continue;
        el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
}

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const has = (p) => !!(S.view && S.view.perms && S.view.perms.includes(p));

async function api(name, data) {
    try {
        const res = await fetch(`https://${RES}/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data || {}),
        });
        return await res.json();
    } catch (e) {
        return { ok: false, msg: t('ui_no_answer') };
    }
}

function applyI18n() {
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

/* ---------------------------------------------------------------- toasts */
function toast(msg, type) {
    if (!msg) return;
    const el = h('div', { class: 'toast ' + (type || '') },
        h('div', { class: 't-label', text: t('ui_toast_label') }),
        h('div', { class: 't-msg', text: msg }));
    $('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3800);
}

/* ---------------------------------------------------------------- dropdown (never a native select) */
function closeDropdowns(except) {
    document.querySelectorAll('.dd.open').forEach((d) => { if (d !== except) { d.classList.remove('open'); const m = d.querySelector('.dd-menu'); if (m) m.remove(); } });
}
document.addEventListener('mousedown', (e) => { if (!e.target.closest('.dd')) closeDropdowns(); });

function makeDd(options, value, onChange, small) {
    const dd = h('div', { class: 'dd' + (small ? ' small' : '') });
    dd.dataset.value = value === undefined || value === null ? '' : String(value);
    const label = h('div', { class: 'dd-value' });
    dd.appendChild(label);
    dd.appendChild(h('i', { class: 'fa-solid fa-chevron-down arrow' }));

    function refresh() {
        const cur = options.find((o) => String(o.value) === dd.dataset.value);
        label.textContent = cur ? cur.label : (options.length ? t('ui_choose') : t('ui_none_available'));
    }
    refresh();

    dd.addEventListener('mousedown', (e) => {
        if (e.target.closest('.dd-menu')) return;
        e.preventDefault();
        if (dd.classList.contains('open')) { closeDropdowns(); return; }
        closeDropdowns(dd);
        dd.classList.add('open');
        const menu = h('div', { class: 'dd-menu' });
        if (!options.length) menu.appendChild(h('div', { class: 'dd-opt none', text: t('ui_none_available') }));
        options.forEach((o) => {
            const opt = h('div', { class: 'dd-opt' + (String(o.value) === dd.dataset.value ? ' selected' : ''), text: o.label });
            opt.addEventListener('mousedown', (ev) => {
                ev.preventDefault(); ev.stopPropagation();
                const changed = dd.dataset.value !== String(o.value);
                dd.dataset.value = String(o.value);
                refresh();
                closeDropdowns();
                if (changed && onChange) onChange(o.value);
            });
            menu.appendChild(opt);
        });
        dd.appendChild(menu);
    });
    return dd;
}
const ddValue = (dd) => dd.dataset.value;

/* ---------------------------------------------------------------- modal */
function openModal(title, body, actions) {
    $('modal-title').textContent = title;
    const b = $('modal-body'); b.innerHTML = '';
    if (body) b.appendChild(body);
    const a = $('modal-actions'); a.innerHTML = '';
    (actions || []).forEach((act) => {
        a.appendChild(h('button', { class: 'wood-btn ' + (act.cls || ''), text: act.label, onClick: () => { if (act.onClick) act.onClick(); else closeModal(); } }));
    });
    $('modal-layer').classList.remove('hidden');
    const first = b.querySelector('input'); if (first) setTimeout(() => first.focus(), 30);
}
function closeModal() { closeDropdowns(); $('modal-layer').classList.add('hidden'); }

function confirmModal(title, text, onYes, danger) {
    openModal(title, h('p', { text }), [
        { label: t('ui_confirm'), cls: danger ? 'danger' : '', onClick: () => { closeModal(); onYes(); } },
        { label: t('ui_cancel'), cls: 'muted-btn' },
    ]);
}

/* ---------------------------------------------------------------- actions */
async function act(action, data, quiet) {
    const res = await api('act', { society: S.view.name, action, data: data || {} });
    if (res.msg && !quiet) toast(res.msg, res.ok ? 'success' : 'error');
    if (res.view) { S.view = res.view; renderHeader(); renderTabs(); }
    if (res.closed) { return res; }
    return res;
}

async function fetchTab(tab, arg) {
    return api('tab', { society: S.view.name, tab, arg });
}

/* ---------------------------------------------------------------- shell */
function renderHeader() {
    const v = S.view;
    $('title').textContent = v.label + (v.tag ? '  [' + v.tag + ']' : '');
    $('subtitle').textContent = (v.type === 'gang' ? t('ui_type_gang') : t('ui_type_job')) + ' · ' + (v.me ? v.me.grade : '');
}

function tabList() {
    const list = ['overview'];
    if (has('members')) list.push('members');
    if (has('ranks')) list.push('ranks');
    if (has('finance')) list.push('finance');
    if (has('fines') || has('finevoid')) list.push('fines');
    if (has('audit')) list.push('audit');
    if (S.view.type === 'gang') list.push('settings');
    return list;
}

function renderTabs() {
    const list = tabList();
    if (!list.includes(S.tab)) S.tab = 'overview';
    const bar = $('tabs'); bar.innerHTML = '';
    list.forEach((id) => {
        bar.appendChild(h('div', { class: 'tab' + (id === S.tab ? ' active' : ''), text: t('ui_tab_' + id), onClick: () => { S.tab = id; renderTabs(); loadTab(); } }));
    });
}

async function loadTab() {
    const c = $('content');
    closeDropdowns();
    if (S.tab === 'overview') return renderOverview();
    c.innerHTML = '';
    c.appendChild(h('div', { class: 'empty', text: t('ui_loading') }));
    const tab = S.tab;
    const res = await fetchTab(tab);
    if (S.tab !== tab) return;
    if (!res.ok) { c.innerHTML = ''; c.appendChild(h('div', { class: 'empty', text: res.msg || t('ui_no_answer') })); return; }
    const fn = { members: renderMembers, ranks: renderRanks, finance: renderFinance, fines: renderFines, audit: renderAudit, settings: renderSettings }[tab];
    c.innerHTML = '';
    fn(res, c);
}

function refreshTab() { return loadTab(); }

/* ---------------------------------------------------------------- overview */
function amountModal(title, action) {
    const input = h('input', { class: 'input', type: 'number', min: '0.01', step: '0.01', placeholder: t('ui_amount') });
    const submit = async () => {
        const res = await act(action, { amount: parseFloat(input.value) });
        if (res.ok) { closeModal(); refreshTab(); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    openModal(title, h('div', { class: 'field' }, h('label', { text: t('ui_amount') }), input), [
        { label: t('ui_confirm'), onClick: submit },
        { label: t('ui_cancel'), cls: 'muted-btn' },
    ]);
}

function renderOverview() {
    const v = S.view, c = $('content');
    c.innerHTML = '';
    const stats = h('div', { class: 'stats' });
    if (v.balance !== undefined && v.balance !== null) {
        stats.appendChild(h('div', { class: 'stat' }, h('div', { class: 'label', text: t('ui_balance') }), h('div', { class: 'value', text: money(v.balance) })));
    }
    stats.appendChild(h('div', { class: 'stat' }, h('div', { class: 'label', text: t('ui_your_rank') }), h('div', { class: 'value', text: v.me.grade })));
    if (v.type === 'gang') {
        const n = v.members + (v.maxMembers ? ' / ' + v.maxMembers : '');
        stats.appendChild(h('div', { class: 'stat' }, h('div', { class: 'label', text: t('ui_tab_members') }), h('div', { class: 'value', text: n })));
    }
    stats.appendChild(h('div', { class: 'stat' }, h('div', { class: 'label', text: t('ui_payroll') }),
        h('div', { class: 'value ' + (v.payroll ? 'ok' : 'bad'), text: v.payroll ? t('ui_on') : t('ui_off') })));
    c.appendChild(stats);

    const bar = h('div', { class: 'toolbar' });
    const left = h('div', { class: 'actions', style: 'display:flex;gap:8px;flex-wrap:wrap' });
    if (has('deposit')) left.appendChild(h('button', { class: 'wood-btn', text: t('ui_deposit'), onClick: () => amountModal(t('ui_deposit'), 'deposit') }));
    if (has('withdraw')) left.appendChild(h('button', { class: 'wood-btn', text: t('ui_withdraw'), onClick: () => amountModal(t('ui_withdraw'), 'withdraw') }));
    if (has('storage') && v.remoteStorage) left.appendChild(h('button', { class: 'wood-btn', text: t('ui_storage'), onClick: () => act('storage') }));
    bar.appendChild(left);
    c.appendChild(bar);
    c.appendChild(h('div', { class: 'italic', text: t('ui_overview_hint') }));
}

/* ---------------------------------------------------------------- members */
function hireModal(grades) {
    const body = h('div');
    const rankDd = makeDd(grades.map((g) => ({ value: g.level, label: g.name })), grades.length ? grades[0].level : '', null, false);
    const slot = h('div', { class: 'field' }, h('label', { text: t('ui_player') }), h('div', { class: 'muted', text: t('ui_loading') }));
    body.appendChild(slot);
    body.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_rank') }), rankDd));
    let playerDd = null;
    openModal(S.view.type === 'gang' ? t('ui_invite') : t('ui_hire'), body, [
        { label: t('ui_confirm'), onClick: async () => {
            if (!playerDd || ddValue(playerDd) === '') return;
            const res = await act('invite', { target: parseInt(ddValue(playerDd), 10), level: parseInt(ddValue(rankDd), 10) });
            if (res.ok) { closeModal(); refreshTab(); }
        } },
        { label: t('ui_cancel'), cls: 'muted-btn' },
    ]);
    fetchTab('nearby', { purpose: 'hire' }).then((res) => {
        slot.innerHTML = '';
        slot.appendChild(h('label', { text: t('ui_player') }));
        playerDd = makeDd(((res && res.players) || []).map((p) => ({ value: p.id, label: p.name })), '', null, false);
        slot.appendChild(playerDd);
        if (!res.players || !res.players.length) slot.appendChild(h('div', { class: 'italic', text: t('ui_nobody_near') }));
    });
}

function renderMembers(data, c) {
    const bar = h('div', { class: 'toolbar' }, h('div', { class: 'grow muted', text: t('ui_member_count', data.members.length) }));
    if (data.canHire) bar.appendChild(h('button', { class: 'wood-btn', text: S.view.type === 'gang' ? t('ui_invite') : t('ui_hire'), onClick: () => hireModal(data.assignable) }));
    c.appendChild(bar);
    if (!data.members.length) c.appendChild(h('div', { class: 'empty', text: t('ui_no_members') }));

    data.members.forEach((m) => {
        const actions = h('div', { class: 'actions' });
        if (m.self) actions.appendChild(h('span', { class: 'badge', text: t('ui_you') }));
        if (m.canManage && data.canPromote) {
            actions.appendChild(makeDd(data.assignable.map((g) => ({ value: g.level, label: g.name })), m.level, async (lvl) => {
                const res = await act('setrank', { cid: m.cid, level: parseInt(lvl, 10) });
                refreshTab();
                return res;
            }, true));
        } else {
            actions.appendChild(h('span', { class: 'badge ' + (m.boss ? 'boss' : ''), text: m.grade }));
        }
        if (m.canManage && data.canTransfer) {
            actions.appendChild(h('button', { class: 'wood-btn small', text: t('ui_transfer'), onClick: () =>
                confirmModal(t('ui_transfer'), t('ui_transfer_confirm', m.name), async () => { await act('transfer', { cid: m.cid }); refreshTab(); }) }));
        }
        if (m.canManage && data.canFire) {
            actions.appendChild(h('button', { class: 'wood-btn small danger', text: t('ui_fire'), onClick: () =>
                confirmModal(t('ui_fire'), t('ui_fire_confirm', m.name), async () => { await act('fire', { cid: m.cid }); refreshTab(); }, true) }));
        }
        c.appendChild(h('div', { class: 'row' },
            h('div', { class: 'dot' + (m.online ? ' on' : ''), title: m.online ? t('ui_online') : t('ui_offline') }),
            h('div', { class: 'main' }, h('div', { class: 'name', text: m.name }), h('div', { class: 'sub', text: m.grade + ' · ' + m.cid })),
            actions));
    });
}

/* ---------------------------------------------------------------- ranks */
function renderRanks(data, c) {
    c.appendChild(h('div', { class: 'notice', text: data.gang ? t('ui_ranks_hint_gang') : t('ui_ranks_hint_job') }));
    data.grades.slice().sort((a, b) => b.level - a.level).forEach((g) => {
        const on = new Set(g.perms);
        const card = h('div', { class: 'row', style: 'display:block' });
        const head = h('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' });
        let nameInput = null, payInput = null;
        if (data.gang && g.editable) {
            nameInput = h('input', { class: 'input', style: 'width:200px', value: g.name, maxlength: '24' });
            payInput = h('input', { class: 'input', style: 'width:110px', type: 'number', min: '0', step: '0.01', value: String(g.pay) });
            head.appendChild(nameInput);
            head.appendChild(h('span', { class: 'muted', text: t('ui_pay') }));
            head.appendChild(payInput);
        } else {
            head.appendChild(h('div', { class: 'name', text: g.name }));
            head.appendChild(h('span', { class: 'muted', text: t('ui_pay') + ' ' + money(g.pay) }));
        }
        if (g.boss) head.appendChild(h('span', { class: 'badge boss', text: t('ui_boss') }));
        card.appendChild(head);

        if (g.boss) {
            card.appendChild(h('div', { class: 'italic', style: 'margin-top:8px', text: t('ui_all_perms') }));
        } else {
            const chips = h('div', { class: 'chips' });
            data.allPerms.forEach((p) => {
                const canToggle = g.editable && data.grantable.includes(p);
                const chip = h('div', { class: 'chip' + (on.has(p) ? ' on' : '') + (canToggle ? '' : ' locked'), text: t('ui_perm_' + p) });
                if (canToggle) chip.addEventListener('click', () => { if (on.has(p)) { on.delete(p); chip.classList.remove('on'); } else { on.add(p); chip.classList.add('on'); } });
                chips.appendChild(chip);
            });
            card.appendChild(chips);
            if (g.editable) {
                card.appendChild(h('div', { style: 'margin-top:10px;text-align:right' },
                    h('button', { class: 'wood-btn small', text: t('ui_save'), onClick: async () => {
                        if (nameInput) {
                            const m = await act('rankmeta', { level: g.level, name: nameInput.value, pay: parseFloat(payInput.value) || 0 });
                            if (!m.ok) return;
                        }
                        await act('perms', { level: g.level, perms: Array.from(on) });
                    } })));
            }
        }
        c.appendChild(card);
    });
}

/* ---------------------------------------------------------------- finance */
const KIND_CLASS = { deposit: 'good', withdraw: 'warn', payroll: '', fine: 'good', refund: '', api: '', admin: 'warn', migration: '' };

function ledgerRow(r) {
    return h('div', { class: 'row' },
        h('div', { class: 'main' },
            h('div', { class: 'name' }, h('span', { class: 'badge ' + (KIND_CLASS[r.kind] || ''), text: t('ui_kind_' + r.kind) }), ' ', r.actor),
            h('div', { class: 'sub', text: (r.note ? r.note + ' · ' : '') + r.date })),
        h('div', { style: 'text-align:right' },
            h('div', { class: r.amount >= 0 ? 'amount-pos' : 'amount-neg', text: (r.amount >= 0 ? '+' : '') + money(r.amount) }),
            h('div', { class: 'sub', text: money(r.balance) })));
}

function moreButton(c, fetcher) {
    const btn = h('button', { class: 'wood-btn muted-btn', style: 'display:block;margin:10px auto', text: t('ui_load_more'), onClick: async () => {
        btn.disabled = true;
        const more = await fetcher();
        btn.remove();
        if (more && more.length) more[more.length - 1].more && c.appendChild(btn);
    } });
    c.appendChild(btn);
    return btn;
}

function renderFinance(data, c) {
    if (!data.payrollEnabled) c.appendChild(h('div', { class: 'notice', text: t('ui_payroll_disabled') }));
    const stats = h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'label', text: t('ui_balance') }), h('div', { class: 'value', text: money(data.balance) })));
    c.appendChild(stats);

    const bar = h('div', { class: 'toolbar' });
    const left = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    if (data.canDeposit) left.appendChild(h('button', { class: 'wood-btn', text: t('ui_deposit'), onClick: () => amountModal(t('ui_deposit'), 'deposit') }));
    if (data.canWithdraw) left.appendChild(h('button', { class: 'wood-btn', text: t('ui_withdraw'), onClick: () => amountModal(t('ui_withdraw'), 'withdraw') }));
    bar.appendChild(left);
    const sw = h('div', { class: 'switch' + (data.payroll ? ' on' : '') + (data.canPayroll ? '' : ' locked') },
        h('div', { class: 'track' }), h('span', { text: t('ui_payroll') }));
    if (data.canPayroll) sw.addEventListener('click', async () => {
        const res = await act('payroll', { enabled: !data.payroll });
        if (res.ok) refreshTab();
    });
    bar.appendChild(sw);
    c.appendChild(bar);

    c.appendChild(h('div', { class: 'italic', style: 'margin-bottom:6px', text: t('ui_payroll_hint') }));
    const paid = data.wages.filter((w) => w.pay > 0);
    if (paid.length) {
        c.appendChild(h('div', { class: 'section-title', text: t('ui_wages') }));
        paid.forEach((w) => c.appendChild(h('div', { class: 'row' }, h('div', { class: 'main' }, h('div', { class: 'name', text: w.name })), h('div', { text: money(w.pay) }))));
    }

    c.appendChild(h('div', { class: 'section-title', text: t('ui_ledger') }));
    if (!data.ledger.length) c.appendChild(h('div', { class: 'empty', text: t('ui_ledger_empty') }));
    const list = h('div'); c.appendChild(list);
    let last = 0;
    const append = (rows) => rows.forEach((r) => { list.appendChild(ledgerRow(r)); last = r.id; });
    append(data.ledger);
    const addMore = (more) => {
        if (!more) return;
        const btn = h('button', { class: 'wood-btn muted-btn', style: 'display:block;margin:10px auto', text: t('ui_load_more'), onClick: async () => {
            btn.remove();
            const res = await fetchTab('finance', { before: last });
            if (res.ok) { append(res.ledger); addMore(res.more); }
        } });
        c.appendChild(btn);
    };
    addMore(data.more);
}

/* ---------------------------------------------------------------- fines */
function fineModal() {
    const body = h('div');
    const slot = h('div', { class: 'field' }, h('label', { text: t('ui_player') }), h('div', { class: 'muted', text: t('ui_loading') }));
    const amount = h('input', { class: 'input', type: 'number', step: '0.01', min: '0.01', placeholder: t('ui_amount') });
    const reason = h('input', { class: 'input', maxlength: '200', placeholder: t('ui_reason') });
    body.appendChild(slot);
    body.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_amount') }), amount));
    body.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_reason') }), reason));
    let playerDd = null;
    openModal(t('ui_issue_fine'), body, [
        { label: t('ui_confirm'), onClick: async () => {
            if (!playerDd || ddValue(playerDd) === '') return;
            const res = await act('fine', { target: parseInt(ddValue(playerDd), 10), amount: parseFloat(amount.value), reason: reason.value });
            if (res.ok) { closeModal(); refreshTab(); }
        } },
        { label: t('ui_cancel'), cls: 'muted-btn' },
    ]);
    fetchTab('nearby', { purpose: 'fine' }).then((res) => {
        slot.innerHTML = '';
        slot.appendChild(h('label', { text: t('ui_player') }));
        playerDd = makeDd(((res && res.players) || []).map((p) => ({ value: p.id, label: p.name })), '', null, false);
        slot.appendChild(playerDd);
        if (!res.players || !res.players.length) slot.appendChild(h('div', { class: 'italic', text: t('ui_nobody_near') }));
    });
}

function fineRow(f, canVoid) {
    const actions = h('div', { class: 'actions' });
    actions.appendChild(h('span', { class: 'badge ' + (f.status === 'paid' ? 'good' : f.status === 'void' ? '' : 'warn'), text: t('ui_fine_' + f.status) }));
    if (canVoid && f.status === 'unpaid') {
        actions.appendChild(h('button', { class: 'wood-btn small danger', text: t('ui_void'), onClick: () =>
            confirmModal(t('ui_void'), t('ui_void_confirm', f.target), async () => { await act('voidfine', { id: f.id }); refreshTab(); }, true) }));
    }
    return h('div', { class: 'row' },
        h('div', { class: 'main' },
            h('div', { class: 'name', text: f.target + ' · ' + money(f.amount) + (f.paid > 0 && f.status === 'unpaid' ? ' (' + money(f.paid) + ' ' + t('ui_paid') + ')' : '') }),
            h('div', { class: 'sub', text: (f.reason ? f.reason + ' · ' : '') + f.issuer + ' · ' + f.date })),
        actions);
}

function renderFines(data, c) {
    const bar = h('div', { class: 'toolbar' }, h('div', { class: 'grow muted', text: t('ui_fines_hint', money(data.min), money(data.max)) }));
    if (data.canIssue && data.enabled) bar.appendChild(h('button', { class: 'wood-btn', text: t('ui_issue_fine'), onClick: fineModal }));
    c.appendChild(bar);
    if (!data.fines.length) c.appendChild(h('div', { class: 'empty', text: t('ui_fines_empty') }));
    const list = h('div'); c.appendChild(list);
    let last = 0;
    const append = (rows) => rows.forEach((f) => { list.appendChild(fineRow(f, data.canVoid)); last = f.id; });
    append(data.fines);
    const addMore = (more) => {
        if (!more) return;
        const btn = h('button', { class: 'wood-btn muted-btn', style: 'display:block;margin:10px auto', text: t('ui_load_more'), onClick: async () => {
            btn.remove();
            const res = await fetchTab('fines', { before: last });
            if (res.ok) { append(res.fines); addMore(res.more); }
        } });
        c.appendChild(btn);
    };
    addMore(data.more);
}

/* ---------------------------------------------------------------- audit */
function auditRow(r) {
    const who = r.actor || t('ui_system');
    return h('div', { class: 'row' },
        h('div', { class: 'main' },
            h('div', { class: 'name' }, h('span', { class: 'badge', text: S.strings['ui_act_' + r.action] || r.action }), ' ', who + (r.target ? '  →  ' + r.target : '')),
            h('div', { class: 'sub', text: (r.detail ? r.detail + ' · ' : '') + r.date })));
}

function renderAudit(data, c) {
    if (!data.rows.length) c.appendChild(h('div', { class: 'empty', text: t('ui_audit_empty') }));
    const list = h('div'); c.appendChild(list);
    let last = 0;
    const append = (rows) => rows.forEach((r) => { list.appendChild(auditRow(r)); last = r.id; });
    append(data.rows);
    const addMore = (more) => {
        if (!more) return;
        const btn = h('button', { class: 'wood-btn muted-btn', style: 'display:block;margin:10px auto', text: t('ui_load_more'), onClick: async () => {
            btn.remove();
            const res = await fetchTab('audit', { before: last });
            if (res.ok) { append(res.rows); addMore(res.more); }
        } });
        c.appendChild(btn);
    };
    addMore(data.more);
}

/* ---------------------------------------------------------------- settings (gangs) */
function renderSettings(data, c) {
    if (data.canEdit) {
        const label = h('input', { class: 'input', value: data.label, maxlength: String(data.maxName) });
        const tag = h('input', { class: 'input', value: data.tag, maxlength: String(data.maxTag), style: 'width:140px;text-transform:uppercase' });
        let color = data.color;
        const sw = h('div', { class: 'swatches' });
        data.colors.forEach((col) => {
            const s = h('div', { class: 'swatch' + (col === color ? ' on' : ''), style: 'background:' + col });
            s.addEventListener('click', () => { color = col; sw.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on')); s.classList.add('on'); });
            sw.appendChild(s);
        });
        c.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_gang_name') }), label));
        c.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_gang_tag') }), tag));
        c.appendChild(h('div', { class: 'field' }, h('label', { text: t('ui_gang_color') }), sw));
        c.appendChild(h('button', { class: 'wood-btn', text: t('ui_save'), onClick: async () => {
            const res = await act('settings', { label: label.value, tag: tag.value, color });
            if (res.ok) refreshTab();
        } }));
    }
    c.appendChild(h('div', { class: 'section-title', text: t('ui_danger_zone') }));
    const row = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' });
    row.appendChild(h('button', { class: 'wood-btn danger', text: t('ui_leave'), onClick: () =>
        confirmModal(t('ui_leave'), t('ui_leave_confirm'), async () => { await act('leave'); }, true) }));
    if (data.canDisband) {
        row.appendChild(h('button', { class: 'wood-btn danger', text: t('ui_disband'), onClick: () =>
            confirmModal(t('ui_disband'), t('ui_disband_confirm'), async () => { await act('disband', { confirm: true }); }, true) }));
    }
    c.appendChild(row);
}

/* ---------------------------------------------------------------- create a gang */
function renderCreate(create) {
    $('title').textContent = t('ui_create_title');
    $('subtitle').textContent = t('ui_type_gang');
    $('tabs').innerHTML = '';
    const c = $('content'); c.innerHTML = '';
    const input = h('input', { class: 'input', maxlength: String(create.max), placeholder: t('ui_gang_name') });
    const card = h('div', { class: 'center-card' },
        h('p', { text: t('ui_create_hint', money(create.cost), create.min, create.max) }),
        h('div', { class: 'field' }, h('label', { text: t('ui_gang_name') }), input),
        h('button', { class: 'wood-btn', text: t('ui_create'), onClick: async () => {
            const res = await api('createGang', { label: input.value });
            toast(res.msg, res.ok ? 'success' : 'error');
            if (res.ok) await api('reopen');
        } }));
    c.appendChild(card);
}

/* ---------------------------------------------------------------- invite */
function showInvite(inv) {
    openModal(t('ui_invite_title'), h('p', { text: t('ui_invite_text', inv.from, inv.society) }), [
        { label: t('ui_accept'), onClick: () => { closeModal(); api('inviteReply', { accepted: true }); } },
        { label: t('ui_decline'), cls: 'muted-btn', onClick: () => { closeModal(); api('inviteReply', { accepted: false }); } },
    ]);
}

/* ---------------------------------------------------------------- window messages */
function openMenu(msg) {
    S.mode = 'menu';
    document.body.classList.remove('invite-only');
    $('root').classList.remove('hidden');
    S.tab = 'overview';
    if (msg.create) { S.view = null; renderCreate(msg.create); return; }
    S.view = msg.view;
    renderHeader(); renderTabs(); renderOverview();
}

window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.strings) { S.strings = d.strings; applyI18n(); }
    if (d.action === 'open') {
        closeModal();
        if (d.mode === 'invite') {
            S.mode = 'invite';
            document.body.classList.add('invite-only');
            $('root').classList.add('hidden');
            showInvite(d.invite);
        } else {
            openMenu(d);
        }
    } else if (d.action === 'invite') {
        showInvite(d.invite);
    } else if (d.action === 'close') {
        closeModal();
        $('root').classList.add('hidden');
        document.body.classList.remove('invite-only');
        S.view = null;
    }
});

$('btn-close').addEventListener('click', () => api('close'));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!$('modal-layer').classList.contains('hidden')) {
            if (S.mode === 'invite') { closeModal(); api('inviteReply', { accepted: false }); } else closeModal();
        } else api('close');
    }
});
$('modal-layer').addEventListener('mousedown', (e) => { if (e.target === $('modal-layer') && S.mode !== 'invite') closeModal(); });
