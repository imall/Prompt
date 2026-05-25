async function init() {
  const { categories, modules } = await fetch('./data/data.json').then(r => r.json());

  // Flat lookup: id → module
  const moduleMap = Object.fromEntries(
    Object.values(modules).flat().map(m => [m.id, m])
  );

  const sidebar = document.getElementById('sidebar');
  const selections = {};         // catId → '' | Set
  const variantSelections = {};  // moduleId → variantId string

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
        variantSelections[item.id] = '';

        const wrapper = document.createElement('div');

        // Checkbox row
        const label = document.createElement('label');
        label.className = 'check-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';

        // Variant placeholder (hidden until checkbox checked)
        const varPh = document.createElement('div');
        if (item.variants?.length) {
          const varSel = document.createElement('select');
          varSel.className = 'variant-sel';
          varSel.innerHTML = `<option value="">— 版本/顏色 —</option>` +
            item.variants.map(v => `<option value="${v.id}">${v.label}</option>`).join('');
          varSel.addEventListener('change', () => {
            variantSelections[item.id] = varSel.value;
            update();
          });
          varPh.appendChild(varSel);
          varPh.style.display = 'none';
        }

        cb.addEventListener('change', () => {
          cb.checked ? selections[cat.id].add(item.id) : selections[cat.id].delete(item.id);
          if (item.variants?.length) varPh.style.display = cb.checked ? '' : 'none';
          if (!cb.checked) {
            variantSelections[item.id] = '';
            varPh.querySelector('select').value = '';
          }
          update();
        });

        label.appendChild(cb);
        label.append(` ${item.label}`);
        wrapper.appendChild(label);
        wrapper.appendChild(varPh);
        group.appendChild(wrapper);
      }
    } else {
      selections[cat.id] = '';

      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">— 不選 —</option>` +
        items.map(i => `<option value="${i.id}">${i.label}</option>`).join('');

      const varPh = document.createElement('div');
      varPh.id = `var-ph-${cat.id}`;

      sel.addEventListener('change', () => {
        selections[cat.id] = sel.value;
        renderVariantSel(sel.value, varPh);
        update();
      });

      group.appendChild(sel);
      group.appendChild(varPh);
    }

    sidebar.appendChild(group);
  }

  // Render variant sub-dropdown for single-select categories
  function renderVariantSel(moduleId, placeholder) {
    placeholder.innerHTML = '';
    if (!moduleId) return;
    const m = moduleMap[moduleId];
    if (!m?.variants?.length) return;

    variantSelections[moduleId] = '';
    const sel = document.createElement('select');
    sel.className = 'variant-sel';
    sel.innerHTML = `<option value="">— 版本/顏色 —</option>` +
      m.variants.map(v => `<option value="${v.id}">${v.label}</option>`).join('');
    sel.addEventListener('change', () => {
      variantSelections[moduleId] = sel.value;
      update();
    });
    placeholder.appendChild(sel);
  }

  // ── Text helpers ──────────────────────────────────────────────────
  function cleanPositive(raw) {
    const lines = raw.split('\n');
    // Skip intro/note lines before the first 【...】 section
    const firstSection = lines.findIndex(l => /^【/.test(l.trim()));
    const relevant = firstSection >= 0 ? lines.slice(firstSection) : lines;

    return relevant
      .filter(l => {
        const t = l.trim();
        // Strip headings, rulers, and 【...】 headers (category header replaces them)
        return t && !t.startsWith('#') && t !== '---' && !/^【.*】/.test(t);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

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

  function applyVariant(moduleId, baseText) {
    const variantId = variantSelections[moduleId];
    const variant = moduleMap[moduleId]?.variants?.find(v => v.id === variantId);
    return variant?.prompt ? variant.prompt + '\n\n' + baseText : baseText;
  }

  // ── Dirty tracking ────────────────────────────────────────────────
  const dirty = { pos: false, neg: false };
  const posOut = document.getElementById('pos-out');
  const negOut = document.getElementById('neg-out');

  posOut.addEventListener('input', () => setDirty('pos', true));
  negOut.addEventListener('input', () => setDirty('neg', true));

  function setDirty(key, val) {
    dirty[key] = val;
    document.getElementById(`refresh-${key}`).classList.toggle('dirty', val);
  }

  document.getElementById('refresh-pos').addEventListener('click', () => { setDirty('pos', false); update(); });
  document.getElementById('refresh-neg').addEventListener('click', () => { setDirty('neg', false); update(); });

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
        continue;
      }

      const parts = [];
      if (cat.multi) {
        for (const id of sel) {
          const m = moduleMap[id];
          if (m) parts.push(applyVariant(id, cleanPositive(m.prompt)));
        }
      } else if (sel) {
        const m = moduleMap[sel];
        if (m) parts.push(applyVariant(sel, cleanPositive(m.prompt)));
      }

      if (parts.length) {
        const body = parts.join('\n\n');
        posParts.push(cat.header ? `${cat.header}\n\n${body}` : body);
      }
    }

    const posText = posParts.join('\n\n');
    const negText = assembleNegative(negPrompts);

    if (!dirty.pos) {
      posOut.value = posText;
      document.getElementById('pos-count').textContent = posText ? `${posText.length} 字元` : '';
    } else {
      document.getElementById('pos-count').textContent = posOut.value ? `${posOut.value.length} 字元` : '';
    }
    if (!dirty.neg) {
      negOut.value = negText;
      document.getElementById('neg-count').textContent = negText ? `${negText.length} 字元` : '';
    } else {
      document.getElementById('neg-count').textContent = negOut.value ? `${negOut.value.length} 字元` : '';
    }
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
    sidebar.querySelectorAll('[id^="var-ph-"]').forEach(ph => { ph.innerHTML = ''; });
    sidebar.querySelectorAll('.variant-sel').forEach(s => {
      s.value = '';
      s.closest('div')?.style.setProperty('display', 'none');
    });
    for (const cat of categories) selections[cat.id] = cat.multi ? new Set() : '';
    Object.keys(variantSelections).forEach(k => { variantSelections[k] = ''; });
    setDirty('pos', false);
    setDirty('neg', false);
    update();
  });
}

init().catch(console.error);
