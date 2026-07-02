/**
 * Diálogo para crear/editar tarjetas. El selector de columna dentro del
 * formulario permite mover tarjetas también en móvil, donde el drag & drop
 * nativo no funciona.
 */
export function initCardDialog({ store, dialogEl }) {
  const form = dialogEl.querySelector("#card-form");
  const heading = dialogEl.querySelector("#card-dialog-title");
  const columnSelect = form.elements.columnId;
  const deleteBtn = dialogEl.querySelector("#btn-delete-card");
  const cancelBtn = dialogEl.querySelector("#btn-cancel-card");

  let editingCardId = null;

  function fillColumnOptions(selectedId) {
    columnSelect.innerHTML = "";
    for (const column of store.activeDepartment?.columns ?? []) {
      const opt = document.createElement("option");
      opt.value = column.id;
      opt.textContent = column.title;
      opt.selected = column.id === selectedId;
      columnSelect.appendChild(opt);
    }
  }

  function openNew() {
    editingCardId = null;
    heading.textContent = "Nueva tarjeta";
    deleteBtn.hidden = true;
    form.reset();
    fillColumnOptions(store.activeDepartment?.columns[0]?.id);
    dialogEl.showModal();
  }

  function openEdit(cardId) {
    const card = store.getCard(cardId);
    if (!card) return;
    editingCardId = cardId;
    heading.textContent = "Editar tarjeta";
    deleteBtn.hidden = false;
    form.elements.title.value = card.title;
    form.elements.description.value = card.description ?? "";
    form.elements.priority.value = card.priority ?? "media";
    form.elements.tags.value = (card.tags ?? []).join(", ");
    fillColumnOptions(store.findColumnOfCard(cardId)?.id);
    dialogEl.showModal();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      title: form.elements.title.value,
      description: form.elements.description.value.trim(),
      priority: form.elements.priority.value,
      tags: form.elements.tags.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const columnId = columnSelect.value;

    if (editingCardId) {
      store.updateCard(editingCardId, data);
      if (store.findColumnOfCard(editingCardId)?.id !== columnId) {
        store.moveCard(editingCardId, columnId);
      }
    } else {
      store.createCard({ ...data, columnId });
    }
    dialogEl.close();
  });

  deleteBtn.addEventListener("click", () => {
    if (editingCardId && confirm("¿Eliminar esta tarjeta?")) {
      store.deleteCard(editingCardId);
      dialogEl.close();
    }
  });

  cancelBtn.addEventListener("click", () => dialogEl.close());

  return { openNew, openEdit };
}
