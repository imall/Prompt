async function init() {
  const { categories, modules } = await fetch('./data/data.json').then(r => r.json());

  // Flat lookup map: id → module
  const moduleMap = Object.fromEntries(
    Object.values(modules).flat().map(m => [m.id, m])
  );

  const sidebar = document.getElementById('sidebar');
  const selections = {}; // categoryId → '' | Set

  // ── Render selectors ──────────────────────────────────────────────
  for (const cat of categories) {
    const items = modules[cat.id];
    if (!items?.length) continue;

    const group = document.createElement('div');
    group.className = 'cat-group';
    group.innerHTML = `<div class="cat-label">${cat.label}</div>`;

    if (cat.multi) {
      selections[cat.id] = new Set();
      for (const item of items) {
        const label = document.createElement('label');
        label.className = 'check-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.addEventListener('change', () => {
          cb.checked ? selections[cat.id].add(item.id) : selections[cat.id].delete(item.id);
          update();
        });
        label.appendChild(cb);
        label.append(` ${item.label}`);
        group.appendChild(label);
      }
    } else {
      selections[cat.id] = '';
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">— 不選 —</option>` +
        items.map(i => `<option value="${i.id}">${i.label}</option>`).join('');
      sel.addEventListener('change', () => { selections[cat.id] = sel.value; update(); });
      group.appendChild(sel);
    }

    sidebar.appendChild(group);
  }

  // ── Text helpers ──────────────────────────────────────────────────

  // Strip markdown headings, rulers, 【section】 headers from a prompt body
  function cleanPositive(raw) {
    return raw
      .split('\n')
      .filter(l => {
        const t = l.trim();
        return t && !t.startsWith('#') && t !== '---' && !/^【.*】/.test(t);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // For negative modules: extract only keyword-list lines (mostly ASCII, comma-separated)
  function assembleNegative(prompts) {
    return prompts
      .flatMap(p => p.split('\n'))
      .map(l => l.trim())
      .filter(l => {
        if (!l || l.startsWith('#') || l === '---' || /^【.*】/.test(l)) return false;
        const ascii = (l.match(/[a-zA-Z0-9,\s_\-]/g) || []).length;
        return l.includes(',') || ascii / l.length > 0.5;
      })
      .join(', ')
      .replace(/,\s*,+/g, ', ')
      .trim();
  }

  // ── Assemble & render ─────────────────────────────────────────────
  function update() {
    const posParts = [];
    const negPrompts = [];

    for (const cat of categories) {
      const sel = selections[cat.id];
      if (cat.id === 'negative') {
        for (const id of sel) {
          const m = moduleMap[id];
          if (m) negPrompts.push(m.prompt);
        }
      } else if (!cat.multi && sel) {
        const m = moduleMap[sel];
        if (m) posParts.push(cleanPositive(m.prompt));
      }
    }

    const posText = posParts.join('\n\n');
    const negText = assembleNegative(negPrompts);

    document.getElementById('pos-out').value = posText;
    document.getElementById('neg-out').value = negText;
    document.getElementById('pos-count').textContent = posText ? `${posText.length} 字元` : '';
    document.getElementById('neg-count').textContent = negText ? `${negText.length} 字元` : '';
  }

  // ── Copy buttons ──────────────────────────────────────────────────
  function bindCopy(btnId, srcId) {
    document.getElementById(btnId).addEventListener('click', async function () {
      const text = document.getElementById(srcId).value;
      if (!text) return;
      await navigator.clipboard.writeText(text);
      this.textContent = '✓ 已複製';
      this.classList.add('copied');
      setTimeout(() => { this.textContent = '複製'; this.classList.remove('copied'); }, 2000);
    });
  }

  bindCopy('copy-pos', 'pos-out');
  bindCopy('copy-neg', 'neg-out');

  // ── Clear all ─────────────────────────────────────────────────────
  document.getElementById('clear-btn').addEventListener('click', () => {
    sidebar.querySelectorAll('select').forEach(s => s.value = '');
    sidebar.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
    for (const cat of categories) selections[cat.id] = cat.multi ? new Set() : '';
    update();
  });
}

init().catch(console.error);
