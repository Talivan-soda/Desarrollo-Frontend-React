let listaDeProductosTienda = [];
const contenedorDeProductos = document.getElementById("productos");

async function cargarLosProductos() {
    try {
        const respuestaServidor = await fetch("../assets/js/productos.json");
        if (respuestaServidor.ok === false) {
            throw new Error("No se pudo cargar el archivo JSON");
        }
        listaDeProductosTienda = await respuestaServidor.json();
        dibujarCatalogo(listaDeProductosTienda);
    } catch (error) {
        Swal.fire("Error de carga", error.message, "error");
    }
}

function dibujarCatalogo(productosParaDibujar) {
    contenedorDeProductos.innerHTML = "";

    productosParaDibujar.forEach((producto) => {
        const divCard = document.createElement("div");
        divCard.className = "producto-card";

        divCard.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" style="width:300px">
            <h3>${producto.nombre}</h3>
            <p>Precio: $${producto.precio}</p>
        `;

        const botonComprar = document.createElement("button");
        botonComprar.innerText = "Agregar al Carrito";
        
        botonComprar.onclick = function() {
            agregarAlCarritoDeCompras(producto.id);
        };

        divCard.appendChild(botonComprar);
        contenedorDeProductos.appendChild(divCard);
    });
}

cargarLosProductos();