let productos = [];

const contenedorProductos = document.getElementById("productos");

// Carga de productos desde el JSON
async function cargarTienda() {
    try {
        const response = await fetch("../assets/js/productos.json");
        if (!response.ok) throw new Error("No se pudo cargar el archivo de productos");
        
        productos = await response.json();
        renderizarProductos(productos);
    } catch (error) {
        Swal.fire("Error", error.message, "error");
    }
}

// Tarjetas de productos en el HTML
function renderizarProductos(lista) {
    contenedorProductos.innerHTML = "";
    lista.forEach(prod => {
        const card = document.createElement("div");
        card.className = "producto-card";
        card.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}" style="width:300px; height:auto;">
            <h3>${prod.nombre}</h3>
            <p>Precio: $${prod.precio}</p>
            <button class="btn-agregar" data-id="${prod.id}">Agregar al carrito</button>
        `;
        contenedorProductos.appendChild(card);
    });

    document.querySelectorAll(".btn-agregar").forEach(btn => {
        btn.onclick = (e) => agregarAlCarrito(parseInt(e.target.dataset.id));
    });
}

cargarTienda();

let carrito = JSON.parse(localStorage.getItem("carrito_sm")) || [];

const spanContador = document.getElementById("cantidad-carrito");
const btnVerCarrito = document.getElementById("ver-carrito");

// Estilo del botón carrito
function aplicarEstiloBotonCarrito() {
    btnVerCarrito.style.position = "fixed";
    btnVerCarrito.style.right = "20px";
    btnVerCarrito.style.bottom = "20px";
    btnVerCarrito.style.zIndex = "1000";
    btnVerCarrito.style.padding = "15px 25px";
    btnVerCarrito.style.backgroundColor = "#007bff";
    btnVerCarrito.style.color = "white";
    btnVerCarrito.style.border = "none";
    btnVerCarrito.style.borderRadius = "50px";
    btnVerCarrito.style.cursor = "pointer";
    btnVerCarrito.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
}

function guardarCarrito() {
    localStorage.setItem("carrito_sm", JSON.stringify(carrito));
    spanContador.innerText = carrito.reduce((acc, p) => acc + p.cantidad, 0);
}

function agregarAlCarrito(id) {
    const prod = productos.find(p => p.id === id);
    const enCarrito = carrito.find(p => p.id === id);

    enCarrito ? enCarrito.cantidad++ : carrito.push({ ...prod, cantidad: 1 });

    guardarCarrito();
    Toastify({ text: `${prod.nombre} añadido`, duration: 2000 }).showToast();
}

function abrirCarrito() {
    if (carrito.length === 0) return Swal.fire("Carrito vacío", "", "info");

    const total = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

    const htmlContenido = `
        <div id="contenedor-alerta" style="max-height: 350px; overflow-y: auto; text-align: left; padding-right: 10px;">
            ${carrito.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <div style="flex: 1; margin-right: 10px; word-break: break-word;">
                        <strong>${p.nombre}</strong><br>
                        <small>$${p.precio} c/u</small>
                    </div>
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <button class="btn-q" data-id="${p.id}" style="padding:0 8px;">-</button>
                        <span>${p.cantidad}</span>
                        <button class="btn-s" data-id="${p.id}" style="padding:0 8px;">+</button>
                    </div>
                    <span style="min-width: 80px; text-align: right;">$${p.precio * p.cantidad}</span>
                </div>
            `).join('')}
        </div>
        <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
            Total: $${total}
        </div>
    `;

    Swal.fire({
        title: 'Tu Carrito',
        html: htmlContenido,
        showCancelButton: true,
        confirmButtonText: 'Continuar con la compra',
        cancelButtonText: 'Cerrar',
        didOpen: () => {
            const modal = Swal.getHtmlContainer();
            modal.querySelectorAll(".btn-s").forEach(b => b.onclick = () => actualizarCantidad(b.dataset.id, 1));
            modal.querySelectorAll(".btn-q").forEach(b => b.onclick = () => actualizarCantidad(b.dataset.id, -1));
        }
    }).then(result => {
        if (result.isConfirmed) iniciarCheckout();
    });
}

function actualizarCantidad(id, delta) {
    const item = carrito.find(p => p.id == id);
    if (item) {
        item.cantidad += delta;
        if (item.cantidad < 1) carrito = carrito.filter(p => p.id != id);
        guardarCarrito();
        abrirCarrito();
    }
}

async function iniciarCheckout() {
    const { value: usuario } = await Swal.fire({
        title: 'Datos de Envío',
        html: `
            <input id="sw-nombre" class="swal2-input" placeholder="Nombre y Apellido">
            <input id="sw-direccion" class="swal2-input" placeholder="Dirección">
        `,
        preConfirm: () => {
            const n = document.getElementById('sw-nombre').value;
            const d = document.getElementById('sw-direccion').value;
            const letrasValidas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑ ";
            let esValido = true;

            for (let i = 0; i < n.length; i++) {
                if (!letrasValidas.includes(n[i])) {
                    esValido = false;
                    break;
                }
            }

            if (!esValido || n === "") return Swal.showValidationMessage("El nombre solo permite letras");
            if (!d) return Swal.showValidationMessage("La dirección es obligatoria");

            return { nombre: n, direccion: d };
        }
    });

    if (!usuario) return;

// Método de Pago
    const { value: metodo } = await Swal.fire({
        title: 'Método de Pago',
        input: 'select',
        inputOptions: { credito: 'Tarjeta de Crédito', debito: 'Tarjeta de Débito', transferencia: 'Transferencia' },
        inputPlaceholder: 'Seleccione una opción',
        showCancelButton: true
    });

    if (metodo === 'transferencia') {
        const msgTr = `Para completar el pago... \nAlias: electron.sm \nCVU: 0000003100012478346843 \nNombre: Daniel Ivàn Canciello \nE-mail: ElectronSM2025@gmail.com`;
        await Swal.fire("Transferencia", msgTr, "info");
        finalizarCompra(usuario, { tipo: "Transferencia" });
    } else if (metodo) {
        procesarTarjeta(usuario, metodo);
    }
}

async function procesarTarjeta(usuario, tipo) {
    const { value: card } = await Swal.fire({
        title: `Datos de Tarjeta (${tipo})`,
        html: `
            <input id="t-num" class="swal2-input" placeholder="16 números" maxlength="16">
            <input id="t-venc" class="swal2-input" placeholder="MM/YY" maxlength="5">
            <input id="t-tit" class="swal2-input" placeholder="Titular de la tarjeta">
            <input id="t-cvv" class="swal2-input" placeholder="CVV (3 dígitos)" maxlength="3">
        `,
        preConfirm: () => {
            const n = document.getElementById('t-num').value;
            const v = document.getElementById('t-venc').value;
            const t = document.getElementById('t-tit').value;
            const c = document.getElementById('t-cvv').value;

            if (n.length !== 16 || isNaN(n)) return Swal.showValidationMessage("La tarjeta debe tener 16 números");
            if (!/^\d{2}\/\d{2}$/.test(v)) return Swal.showValidationMessage("Formato de fecha inválido (MM/YY)");
            if (!/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/.test(t)) return Swal.showValidationMessage("Titular debe ser solo letras");
            if (c.length !== 3 || isNaN(c)) return Swal.showValidationMessage("CVV debe ser de 3 números");

            return { tipo, numero: n, titular: t };
        }
    });

    if (card) finalizarCompra(usuario, card);
}

// RESUMEN Y DESCARGA 
function finalizarCompra(usuario, pago) {
    const totalFinal = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    const resumenTxt = `
--- ELECTRON SM: RESUMEN DE COMPRA ---
CLIENTE: ${usuario.nombre}
DIRECCIÓN: ${usuario.direccion}
PAGO: ${pago.tipo} ${pago.numero ? '(Card: ****' + pago.numero.slice(-4) + ')' : ''}

PRODUCTOS:
${carrito.map(p => `- ${p.nombre} x${p.cantidad}: $${p.precio * p.cantidad}`).join('\n')}

TOTAL A ABONAR: $${totalFinal}
---------------------------------------
¡Gracias por su compra!
    `;

    Swal.fire({
        title: '¡Compra Exitosa!',
        html: `<pre style="text-align:left; font-size:10px;">${resumenTxt}</pre>`,
        confirmButtonText: 'Descargar Comprobante'
    }).then(res => {
        if (res.isConfirmed) {
            const blob = new Blob([resumenTxt], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = "comprobante_electronSM.txt";
            link.click();
        }
        carrito = [];
        localStorage.removeItem("carrito_sm");
        guardarCarrito();
    });
}

// Inicialización
btnVerCarrito.onclick = abrirCarrito;
aplicarEstiloBotonCarrito();
guardarCarrito();