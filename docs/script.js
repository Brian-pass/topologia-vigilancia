let datos = {};
let pieChart = null;
let barChart = null;

// Cargar datos del JSON
async function cargarDatos() {
    try {
        const response = await fetch('data.json');
        datos = await response.json();
        inicializarUI();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Inicializar la interfaz
function inicializarUI() {
    actualizarEstadisticas();
    llenarServidoresRegionales();
    llenarRegiones();
    llenarTopologia();
    llenarTabla();
    crearGraficoResumen();
    crearGraficoBarras();
}

// Actualizar estadísticas principales
function actualizarEstadisticas() {
    document.getElementById('totalCamaras').textContent = datos.camaras.length;
    document.getElementById('totalCentrales').textContent = datos.centrales_regionales.length + 1;
    document.getElementById('totalSucursales').textContent = datos.sucursales.length;
}

// Llenar tarjetas de servidores regionales
function llenarServidoresRegionales() {
    const container = document.getElementById('servidoresContainer');
    container.innerHTML = '';

    // Central Principal
    const centralPrincipal = datos.central_principal;
    const cardPrincipal = document.createElement('div');
    cardPrincipal.className = 'servidor-card cerrito';
    cardPrincipal.innerHTML = `
        <h4>${centralPrincipal.nombre}</h4>
        <p><strong>IP:</strong> ${centralPrincipal.ip}</p>
        <p><strong>MAC:</strong> ${centralPrincipal.mac}</p>
        <div class="servidor-stats">
            <div class="servidor-stat">
                <div class="servidor-stat-value">${centralPrincipal.cantidad_nvr}</div>
                <div class="servidor-stat-label">NVRs</div>
            </div>
            <div class="servidor-stat">
                <div class="servidor-stat-value">${centralPrincipal.cantidad_camaras_totales}</div>
                <div class="servidor-stat-label">Cámaras</div>
            </div>
        </div>
    `;
    container.appendChild(cardPrincipal);

    // Centrales Regionales
    datos.centrales_regionales.forEach(central => {
        const card = document.createElement('div');
        const regionClass = central.region.toLowerCase().replace(/\s+/g, '');
        card.className = `servidor-card ${regionClass}`;
        card.innerHTML = `
            <h4>${central.nombre}</h4>
            <p><strong>Región:</strong> ${central.region}</p>
            <p><strong>IP:</strong> ${central.ip}</p>
            <div class="servidor-stats">
                <div class="servidor-stat">
                    <div class="servidor-stat-value">${central.cantidad_sucursales}</div>
                    <div class="servidor-stat-label">Sucursales</div>
                </div>
                <div class="servidor-stat">
                    <div class="servidor-stat-value">${central.cantidad_camaras}</div>
                    <div class="servidor-stat-label">Cámaras</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Llenar opciones de filtro de regiones
function llenarRegiones() {
    const select = document.getElementById('regionFilter');
    const regiones = new Set(datos.sucursales.map(s => s.region));
    
    regiones.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        select.appendChild(option);
    });

    select.addEventListener('change', () => {
        if (barChart) barChart.destroy();
        crearGraficoBarras();
    });
}

// Crear gráfico de pastel (Resumen)
function crearGraficoResumen() {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    const datosGrafico = datos.centrales_regionales.map(central => ({
        label: central.region,
        value: central.cantidad_camaras,
        color: central.color
    }));

    // Agregar Cerrito
    const camarasCerrito = datos.equipos_cerrito.reduce((sum, eq) => sum + eq.cantidad_camaras, 0);
    datosGrafico.push({
        label: 'CERRITO',
        value: camarasCerrito,
        color: '#FFFFFF'
    });

    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datosGrafico.map(d => d.label),
            datasets: [{
                data: datosGrafico.map(d => d.value),
                backgroundColor: datosGrafico.map(d => d.color),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Crear gráfico de barras
function crearGraficoBarras() {
    const ctx = document.getElementById('barChart').getContext('2d');
    const regionSeleccionada = document.getElementById('regionFilter').value;
    
    let sucursalesFiltradas = datos.sucursales;
    if (regionSeleccionada) {
        sucursalesFiltradas = datos.sucursales.filter(s => s.region === regionSeleccionada);
    }

    // Ordenar por cantidad de cámaras (descendente)
    sucursalesFiltradas = sucursalesFiltradas.sort((a, b) => b.cantidad_camaras - a.cantidad_camaras);

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sucursalesFiltradas.map(s => s.nombre),
            datasets: [{
                label: 'Cantidad de Cámaras',
                data: sucursalesFiltradas.map(s => s.cantidad_camaras),
                backgroundColor: sucursalesFiltradas.map(s => s.color),
                borderColor: '#667eea',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Llenar topología
function llenarTopologia() {
    const container = document.getElementById('topologyContainer');
    container.innerHTML = '';

    // Central Principal
    const centralPrincipal = datos.central_principal;
    const nodoPrincipal = document.createElement('div');
    nodoPrincipal.className = 'topology-node principal';
    nodoPrincipal.innerHTML = `
        <div class="topology-node-title">🔴 ${centralPrincipal.nombre}</div>
        <div class="topology-node-info"><strong>IP:</strong> ${centralPrincipal.ip}</div>
        <div class="topology-node-info"><strong>Cámaras Totales:</strong> ${centralPrincipal.cantidad_camaras_totales}</div>
    `;
    container.appendChild(nodoPrincipal);

    // Equipos de Cerrito
    if (datos.equipos_cerrito.length > 0) {
        const childrenCerrito = document.createElement('div');
        childrenCerrito.className = 'topology-children';
        
        datos.equipos_cerrito.forEach(eq => {
            const child = document.createElement('div');
            child.className = 'topology-child';
            child.style.borderLeftColor = '#000';
            child.innerHTML = `
                <div class="topology-node-title">📹 ${eq.nombre}</div>
                <div class="topology-node-info"><strong>IP:</strong> ${eq.ip}</div>
                <div class="topology-node-info"><strong>Cámaras:</strong> ${eq.cantidad_camaras}</div>
            `;
            childrenCerrito.appendChild(child);
        });
        
        container.appendChild(childrenCerrito);
    }

    // Centrales Regionales
    datos.centrales_regionales.forEach(central => {
        const nodo = document.createElement('div');
        nodo.className = 'topology-node';
        nodo.style.borderLeftColor = central.color;
        nodo.innerHTML = `
            <div class="topology-node-title">🔵 ${central.nombre}</div>
            <div class="topology-node-info"><strong>Región:</strong> ${central.region}</div>
            <div class="topology-node-info"><strong>IP:</strong> ${central.ip}</div>
            <div class="topology-node-info"><strong>Sucursales:</strong> ${central.cantidad_sucursales}</div>
            <div class="topology-node-info"><strong>Cámaras:</strong> ${central.cantidad_camaras}</div>
        `;
        container.appendChild(nodo);

        // Sucursales de esta central
        const sucursalesDelaCentral = datos.sucursales.filter(s => s.conectada_a_central === central.nombre);
        if (sucursalesDelaCentral.length > 0) {
            const children = document.createElement('div');
            children.className = 'topology-children';
            
            sucursalesDelaCentral.forEach(sucursal => {
                const child = document.createElement('div');
                child.className = 'topology-child';
                child.style.borderLeftColor = sucursal.color;
                child.innerHTML = `
                    <div class="topology-node-title">🏢 ${sucursal.nombre}</div>
                    <div class="topology-node-info"><strong>NVRs:</strong> ${sucursal.cantidad_nvr}</div>
                    <div class="topology-node-info"><strong>Cámaras:</strong> ${sucursal.cantidad_camaras}</div>
                    <div class="topology-node-info"><strong>Vínculo:</strong> ${sucursal.tamaño_vinculo}</div>
                `;
                children.appendChild(child);
            });
            
            container.appendChild(children);
        }
    });
}

// Llenar tabla
function llenarTabla() {
    const container = document.getElementById('tableContainer');
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Sucursal</th>
                <th>Región</th>
                <th>NVRs</th>
                <th>Cámaras</th>
                <th>Vínculo</th>
                <th>Central</th>
            </tr>
        </thead>
        <tbody id="tableBody">
        </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);

    const tableBody = document.getElementById('tableBody');
    datos.sucursales.forEach(sucursal => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sucursal.nombre}</td>
            <td>${sucursal.region}</td>
            <td>${sucursal.cantidad_nvr}</td>
            <td>${sucursal.cantidad_camaras}</td>
            <td>${sucursal.tamaño_vinculo}</td>
            <td>${sucursal.conectada_a_central}</td>
        `;
        tableBody.appendChild(row);
    });

    // Buscar
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Manejo de tabs
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remover clase active de todos los botones y panes
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        // Agregar clase active al botón y pane seleccionado
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // Redimensionar gráficos si es necesario
        if (tabId === 'graficos' && barChart) {
            barChart.resize();
        } else if (tabId === 'resumen' && pieChart) {
            pieChart.resize();
        }
    });
});

// Cargar datos al iniciar
cargarDatos();
