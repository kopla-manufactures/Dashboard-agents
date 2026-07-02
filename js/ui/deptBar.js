/**
 * Barra de departamentos: pestañas para cambiar de espacio de trabajo,
 * crear nuevos, renombrar (doble toque) y eliminar el activo.
 */
import { bus } from "../core/eventBus.js";

export function initDeptBar({ store, barEl }) {
  function render() {
    barEl.innerHTML = "";
    const activeId = store.activeDepartment?.id;

    for (const dept of store.state.departments) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "dept-tab" + (dept.id === activeId ? " is-active" : "");
      tab.textContent = dept.name;
      tab.setAttribute("aria-pressed", String(dept.id === activeId));
      tab.addEventListener("click", () => {
        if (dept.id !== store.activeDepartment?.id) {
          store.setActiveDepartment(dept.id);
          return;
        }
        // Segundo toque sobre el activo: renombrar o eliminar
        const name = prompt(
          `Renombrar «${dept.name}» (deja vacío y acepta para eliminarlo):`,
          dept.name
        );
        if (name === null) return;
        if (name.trim()) {
          store.renameDepartment(dept.id, name);
        } else if (
          confirm(`¿Eliminar el departamento «${dept.name}» con todas sus tareas?`)
        ) {
          store.deleteDepartment(dept.id);
        }
      });
      barEl.appendChild(tab);
    }

    const add = document.createElement("button");
    add.type = "button";
    add.className = "dept-tab dept-add";
    add.textContent = "+ Departamento";
    add.addEventListener("click", () => {
      const name = prompt("Nombre del nuevo departamento:");
      if (name?.trim()) {
        const dept = store.createDepartment(name);
        store.setActiveDepartment(dept.id);
      }
    });
    barEl.appendChild(add);
  }

  bus.on("state:changed", render);
  render();
}
