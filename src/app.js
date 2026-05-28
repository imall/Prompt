async function init() {
  const { categories, modules } = await fetch('./data/data.json').then(r => r.json());

  // Flat lookup: id → module
  const moduleMap = Object.fromEntries(
    Object.values(modules).flat().map(m => [m.id, m])
  );

  const sidebar = document.getElementById('sidebar');
  const selections = {};         // catId → '' | Set
  const variantSelections = {};  // moduleId → variantId string
  const optionSelections = {};   // moduleId → { axis: value }

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
        const hasOpts = item.options?.length;
        const hasVariants = item.variants?.length;
        if (hasOpts) {
          optionSelections[item.id] = {};
          renderOptionsInto(item, varPh);
          varPh.style.display = 'none';
        } else if (hasVariants) {
          variantSelections[item.id] = '';
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
          if (hasOpts || hasVariants) varPh.style.display = cb.checked ? '' : 'none';
          if (!cb.checked) {
            if (hasVariants) { variantSelections[item.id] = ''; varPh.querySelector('select').value = ''; }
            if (hasOpts) { optionSelections[item.id] = {}; resetOptionsUI(varPh); }
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

    if (m?.options?.length) {
      optionSelections[moduleId] = {};
      renderOptionsInto(m, placeholder);
      return;
    }

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

  function renderOptionsInto(m, placeholder) {
    const moduleId = m.id;
    for (const opt of m.options) {
      const row = document.createElement('div');
      row.className = 'option-row';
      if (opt.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'variant-sel';
        sel.innerHTML = `<option value="">— ${opt.label} —</option>` +
          opt.choices.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        sel.addEventListener('change', () => {
          optionSelections[moduleId] = optionSelections[moduleId] ?? {};
          optionSelections[moduleId][opt.axis] = sel.value;
          update();
        });
        row.appendChild(sel);
      } else if (opt.type === 'toggle') {
        const lbl = document.createElement('label');
        lbl.className = 'check-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.addEventListener('change', () => {
          optionSelections[moduleId] = optionSelections[moduleId] ?? {};
          optionSelections[moduleId][opt.axis] = cb.checked;
          update();
        });
        lbl.appendChild(cb);
        lbl.append(` ${opt.label}`);
        row.appendChild(lbl);
      }
      placeholder.appendChild(row);
    }
  }

  function resetOptionsUI(placeholder) {
    placeholder.querySelectorAll('select').forEach(s => s.value = '');
    placeholder.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
  }

  // ── Text helpers ──────────────────────────────────────────────────
  function cleanPrompt(raw) {
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

  function applyVariant(moduleId, baseText) {
    const m = moduleMap[moduleId];

    if (m?.options?.length && m?.prompt_template) {
      const sels = optionSelections[moduleId] ?? {};
      let prompt = m.prompt_template;
      for (const opt of m.options) {
        let value = '';
        if (opt.type === 'select') {
          const choice = opt.choices?.find(c => c.id === sels[opt.axis]);
          value = choice?.value ?? '';
        } else if (opt.type === 'toggle') {
          value = sels[opt.axis] ? (opt.token ?? '') : '';
        }
        prompt = prompt.replace(`{${opt.axis}}`, value);
      }
      return prompt + '\n\n' + baseText;
    }

    const variantId = variantSelections[moduleId];
    const variant = m?.variants?.find(v => v.id === variantId);
    return variant?.prompt ? variant.prompt + '\n\n' + baseText : baseText;
  }

  // ── Dirty tracking ────────────────────────────────────────────────
  const dirty = { pos: false };
  const posOut = document.getElementById('pos-out');

  posOut.addEventListener('input', () => setDirty(true));

  function setDirty(val) {
    dirty.pos = val;
    document.getElementById('refresh-pos').classList.toggle('dirty', val);
  }

  document.getElementById('refresh-pos').addEventListener('click', () => { setDirty(false); update(); });

  // ── Negative category IDs ─────────────────────────────────────────
  const NEG_CATS = new Set(['negative', 'character_negative']);

  // ── Assemble & render ─────────────────────────────────────────────
  function update() {
    const posParts = [];
    const negParts = [];

    for (const cat of categories) {
      const sel = selections[cat.id];
      const isNeg = NEG_CATS.has(cat.id);

      if (isNeg) {
        if (cat.multi) {
          for (const id of sel) {
            const m = moduleMap[id];
            if (m) negParts.push(cleanPrompt(m.prompt));
          }
        } else if (sel) {
          const m = moduleMap[sel];
          if (m) negParts.push(cleanPrompt(m.prompt));
        }
        continue;
      }

      const parts = [];
      if (cat.multi) {
        for (const id of sel) {
          const m = moduleMap[id];
          if (m) parts.push(applyVariant(id, cleanPrompt(m.prompt)));
        }
      } else if (sel) {
        const m = moduleMap[sel];
        if (m) parts.push(applyVariant(sel, cleanPrompt(m.prompt)));
      }

      if (parts.length) {
        const body = parts.join('\n\n');
        posParts.push(cat.header ? `${cat.header}\n\n${body}` : body);
      }
    }

    let fullText = posParts.join('\n\n');
    if (negParts.length) {
      fullText += '\n\n---\n\n' + negParts.join('\n\n');
    }

    if (!dirty.pos) {
      posOut.value = fullText;
      document.getElementById('pos-count').textContent = fullText ? `${fullText.length} 字元` : '';
    } else {
      document.getElementById('pos-count').textContent = posOut.value ? `${posOut.value.length} 字元` : '';
    }
  }

  // ── Copy button ───────────────────────────────────────────────────
  document.getElementById('copy-pos').addEventListener('click', async function () {
    const text = posOut.value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    this.textContent = '✓ 已複製';
    this.classList.add('copied');
    setTimeout(() => { this.textContent = '複製'; this.classList.remove('copied'); }, 2000);
  });

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
    Object.keys(optionSelections).forEach(k => { optionSelections[k] = {}; });
    setDirty(false);
    update();
  });
}

init().catch(console.error);
