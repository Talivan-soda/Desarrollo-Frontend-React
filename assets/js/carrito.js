let carritoDeCompras = JSON.parse(localStorage.getItem("carrito_guardado")) || [];

const textoContador = document.getElementById("cantidad-carrito");
const botonVerCarrito = document.getElementById("ver-carrito");

botonVerCarrito.style.position = "fixed";
botonVerCarrito.style.right = "20px";
botonVerCarrito.style.bottom = "20px";
botonVerCarrito.style.zIndex = "1000";

function actualizarElCarrito() {
    localStorage.setItem("carrito_guardado", JSON.stringify(carritoDeCompras));
    const cantidadTotal = carritoDeCompras.reduce((total, item) => total + item.cantidad, 0);
    textoContador.innerText = cantidadTotal;
}

function agregarAlCarritoDeCompras(idSeleccionado) {
    const productoEncontrado = listaDeProductosTienda.find((producto) => producto.id === idSeleccionado);
    const yaEstaEnCarrito = carritoDeCompras.find((item) => item.id === idSeleccionado);

    if (yaEstaEnCarrito) {
        yaEstaEnCarrito.cantidad++;
    } else {
        carritoDeCompras.push({ ...productoEncontrado, cantidad: 1 });
    }

    actualizarElCarrito();
    Toastify({ text: "Agregado correctamente", gravity: "top" }).showToast();
}

function cambiarCantidadManual(idBuscado, operacion) {
    const item = carritoDeCompras.find((producto) => producto.id === idBuscado);
    if (item) {
        if (operacion === "sumar") item.cantidad++;
        if (operacion === "restar") item.cantidad--;
        
        if (item.cantidad <= 0) {
            eliminarProductoCompleto(idBuscado);
        } else {
            actualizarElCarrito();
            abrirVentanaCarrito();
        }
    }
}

function eliminarProductoCompleto(idParaBorrar) {
    carritoDeCompras = carritoDeCompras.filter((producto) => producto.id !== idParaBorrar);
    actualizarElCarrito();
    abrirVentanaCarrito();
}

function vaciarCarritoTotal() {
    carritoDeCompras = [];
    localStorage.removeItem("carrito_guardado");
    actualizarElCarrito();
    Swal.fire("Carrito vacío", "", "success");
}

function abrirVentanaCarrito() {
    if (carritoDeCompras.length === 0) {
        return Swal.fire("Tu carrito está vacío", "", "info");
    }

    const sumaTotal = carritoDeCompras.reduce((acumulador, producto) => acumulador + (producto.precio * producto.cantidad), 0);
    
    const contenedorAlerta = document.createElement("div");
    contenedorAlerta.style.maxHeight = "350px";
    contenedorAlerta.style.overflowY = "auto";
    contenedorAlerta.style.textAlign = "left";

    carritoDeCompras.forEach((producto) => {
        const divItem = document.createElement("div");
        divItem.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:10px 0;";
        
        divItem.innerHTML = `
            <div style="flex:1;">
                <strong>${producto.nombre}</strong><br>
                <span>$${producto.precio} x ${producto.cantidad} = $${producto.precio * producto.cantidad}</span>
            </div>
        `;

        const botonMenos = document.createElement("button");
        botonMenos.innerText = "-";
        botonMenos.onclick = () => cambiarCantidadManual(producto.id, "restar");

        const botonMas = document.createElement("button");
        botonMas.innerText = "+";
        botonMas.onclick = () => cambiarCantidadManual(producto.id, "sumar");

        const botonBorrar = document.createElement("button");
        botonBorrar.innerText = "X";
        botonBorrar.style.color = "red";
        botonBorrar.onclick = () => eliminarProductoCompleto(producto.id);

        divItem.appendChild(botonMenos);
        divItem.appendChild(botonMas);
        divItem.appendChild(botonBorrar);
        contenedorAlerta.appendChild(divItem);
    });

    const totalVisual = document.createElement("h3");
    totalVisual.innerText = "Total: $" + sumaTotal;
    totalVisual.style.textAlign = "right";
    contenedorAlerta.appendChild(totalVisual);

    Swal.fire({
        title: 'Detalle de tu compra',
        html: contenedorAlerta,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Continuar con la compra',
        denyButtonText: 'Vaciar Carrito',
        cancelButtonText: 'Cerrar'
    }).then((resultado) => {
        if (resultado.isConfirmed) {
            flujoDeDatosUsuario();
        } else if (resultado.isDenied) {
            vaciarCarritoTotal();
        }
    });
}

async function flujoDeDatosUsuario() {
    const { value: datosPersonales } = await Swal.fire({
        title: 'Datos de Envío',
        html: `
            <input id="input-nom" class="swal2-input" placeholder="Nombre y Apellido">
            <input id="input-dir" class="swal2-input" placeholder="Dirección">
        `,
        preConfirm: () => {
            const nombre = document.getElementById('input-nom').value;
            const direccion = document.getElementById('input-dir').value;
            const letras = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑ ";
            
            if (nombre === "") return Swal.showValidationMessage("El nombre no puede estar vacío");
            
            for (let i = 0; i < nombre.length; i++) {
                if (letras.includes(nombre[i]) === false) {
                    return Swal.showValidationMessage("El nombre solo acepta letras");
                }
            }
            if (direccion === "") return Swal.showValidationMessage("La dirección es obligatoria");

            return { nombre, direccion };
        }
    });

    if (datosPersonales) elegirPago(datosPersonales);
}

async function elegirPago(usuario) {
    const { value: metodo } = await Swal.fire({
        title: 'Método de Pago',
        input: 'select',
        inputOptions: { credito: 'Tarjeta de Crédito', debito: 'Tarjeta de Débito', transferencia: 'Transferencia' }
    });

    if (metodo === "transferencia") {
        const mensajeTransferencia = "Alias: electron.sm\nCVU: 0000003100012478346843\nNombre: Daniel Ivàn Canciello\nE-mail: ElectronSM2025@gmail.com";
        await Swal.fire("Datos de Transferencia", mensajeTransferencia, "info");
        generarComprobanteFinal(usuario, { tipo: "Transferencia" });
    } else if (metodo) {
        formularioTarjeta(usuario, metodo);
    }
}

async function formularioTarjeta(usuario, tipoTarjeta) {
    const { value: tarjeta } = await Swal.fire({
        title: 'Datos de la Tarjeta',
        html: `
            <input id="t-num" class="swal2-input" placeholder="16 números" maxlength="16">
            <input id="t-fec" class="swal2-input" placeholder="03/29" maxlength="5">
            <input id="t-tit" class="swal2-input" placeholder="Nombre Titular">
            <input id="t-cvv" class="swal2-input" placeholder="CVV (3 dígitos)" maxlength="3">
        `,
        preConfirm: () => {
            const numeroTarjeta = document.getElementById('t-num').value;
            const fechaTarjeta = document.getElementById('t-fec').value;
            const titularTarjeta = document.getElementById('t-tit').value;
            const cvv = document.getElementById('t-cvv').value;
            const numeros = "0123456789";

            if (numeroTarjeta.length !== 16) return Swal.showValidationMessage("Faltan números en la tarjeta");
            for(let n of numeroTarjeta) { 
                if(!numeros.includes(n)) return Swal.showValidationMessage("La tarjeta solo lleva números"); 
            }

            if (fechaTarjeta.length !== 5 || fechaTarjeta[2] !== "/") {
                return Swal.showValidationMessage("Formato de fecha inválido (MM/YY)");
            }

            const letrasPermitidas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑ ";
            if (titularTarjeta === "") return Swal.showValidationMessage("El nombre no puede estar vacío");
            for (let i = 0; i < titularTarjeta.length; i++) {
                if (!letrasPermitidas.includes(titularTarjeta[i])) {
                    return Swal.showValidationMessage("Titular solo permite letras");
                }
            }
            
            if (cvv.length !== 3) return Swal.showValidationMessage("El CVV debe tener 3 números");
            for(let n of cvv) { 
                if(!numeros.includes(n)) return Swal.showValidationMessage("El CVV solo lleva números"); 
            }

            return { num: numeroTarjeta, tipo: tipoTarjeta };
        }
    });

    if (tarjeta) generarComprobanteFinal(usuario, tarjeta);
}

function generarComprobanteFinal(u, p) {
    const total = carritoDeCompras.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    let listaTexto = "";
    carritoDeCompras.forEach(item => {
        listaTexto += "- " + item.nombre + " x" + item.cantidad + ": $" + (item.precio * item.cantidad) + "\n";
    });

    const resumen = "ELECTRON SM - RESUMEN\n" +
                    "Cliente: " + u.nombre + "\n" +
                    "Dirección: " + u.direccion + "\n" +
                    "Pago: " + p.tipo + "\n" +
                    "PRODUCTOS:\n" + listaTexto +
                    "TOTAL FINAL: $" + total;

    Swal.fire({
        title: '¡Compra Exitosa!',
        html: `<pre style="text-align:left; font-size:12px;">${resumen}</pre>`,
        confirmButtonText: 'Descargar Resumen'
    }).then((res) => {
        if (res.isConfirmed) {
            const archivo = new Blob([resumen], { type: 'text/plain' });
            const linkDescarga = document.createElement('a');
            linkDescarga.href = URL.createObjectURL(archivo);
            linkDescarga.download = "comprobante_compra.txt";
            linkDescarga.click();
        }
        carritoDeCompras = [];
        actualizarElCarrito();
    });
}

botonVerCarrito.onclick = abrirVentanaCarrito;
actualizarElCarrito();