let datos = {};
let pieChart = null;
let barChart = null;

// Cargar datos del JSON
async function cargarDatos() {
    try {
        const response = await fetch('data.json');
        datos = await response.json();
        inicializarUI();
        configurarTabs();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Configurar funcionalidad de tabs
function configurarTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Agregar clase active al botón y pane seleccionado
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
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

// Calcular cantidad de cámaras por central
function calcularCamarasPorCentral(nombreCentral) {
    return datos.sucursales
        .filter(s => s.conectada_a_central === nombreCentral)
        .reduce((sum, s) => sum + (s.cantidad_camaras || 0), 0);
}

// Calcular cantidad de cámaras en Cerrito
function calcularCamarasCerrito() {
    return datos.equipos_cerrito.reduce((sum, eq) => sum + (eq.cantidad_camaras || 0), 0);
}

// Llenar tarjetas de servidores regionales
function llenarServidoresRegionales() {
    const container = document.getElementById('servidoresContainer');
    container.innerHTML = '';

    // Central Principal
    const centralPrincipal = datos.central_principal;
    const totalCamarasCerrito = calcularCamarasCerrito();
    const totalCamarasRegionales = datos.centrales_regionales.reduce((sum, c) => sum + calcularCamarasPorCentral(c.nombre), 0);
    
    const cardPrincipal = document.createElement('div');
    cardPrincipal.className = 'servidor-card';
    cardPrincipal.style.borderColor = '#8B00FF';
    cardPrincipal.style.borderLeftColor = '#8B00FF';
    cardPrincipal.innerHTML = `
        <h4>${centralPrincipal.nombre}</h4>
        <p><strong>IP:</strong> ${centralPrincipal.ip}</p>
        <p><strong>MAC:</strong> ${centralPrincipal.mac}</p>
        <div class="servidor-stats">
            <div class="servidor-stat">
                <div class="servidor-stat-value">${datos.equipos_cerrito.length}</div>
                <div class="servidor-stat-label">NVRs</div>
            </div>
            <div class="servidor-stat">
                <div class="servidor-stat-value">${totalCamarasCerrito}</div>
                <div class="servidor-stat-label">Cámaras</div>
            </div>
        </div>
    `;
    container.appendChild(cardPrincipal);

    // Centrales Regionales
    datos.centrales_regionales.forEach(central => {
        const card = document.createElement('div');
        card.className = 'servidor-card';
        card.style.borderColor = central.color || '#999999';
        card.style.borderLeftColor = central.color || '#999999';
        
        const cantidadSucursales = datos.sucursales.filter(s => s.conectada_a_central === central.nombre).length;
        const cantidadCamaras = calcularCamarasPorCentral(central.nombre);
        
        card.innerHTML = `
            <h4>${central.nombre}</h4>
            <p><strong>Región:</strong> ${central.region}</p>
            <p><strong>IP:</strong> ${central.ip}</p>
            <div class="servidor-stats">
                <div class="servidor-stat">
                    <div class="servidor-stat-value">${cantidadSucursales}</div>
                    <div class="servidor-stat-label">Sucursales</div>
                </div>
                <div class="servidor-stat">
                    <div class="servidor-stat-value">${cantidadCamaras}</div>
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
    
    const coloresRegion = {
        'CERRITO': '#8B00FF',
        'San Juan': '#FFFF00',
        'Santa Cruz': '#0070C0',
        'Entre Rios': '#FF0000',
        'Santa Fe': '#00B050'
    };
    
    const datosGrafico = [];
    
    // Agregar Cerrito
    const camarasCerrito = calcularCamarasCerrito();
    datosGrafico.push({
        label: 'CERRITO',
        value: camarasCerrito,
        color: coloresRegion['CERRITO']
    });
    
    // Agregar centrales regionales
    datos.centrales_regionales.forEach(central => {
        const cantidadCamaras = calcularCamarasPorCentral(central.nombre);
        datosGrafico.push({
            label: central.region,
            value: cantidadCamaras,
            color: coloresRegion[central.region] || '#999999'
        });
    });

    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datosGrafico.map(d => d.label),
            datasets: [{
                data: datosGrafico.map(d => d.value),
                backgroundColor: datosGrafico.map(d => d.color),
                borderColor: '#333',
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
    
    // Agregar equipos locales de Cerrito si se selecciona o si es "todas las regiones"
    let equiposCerritoFiltrados = [];
    if (!regionSeleccionada || regionSeleccionada === 'CERRITO') {
        equiposCerritoFiltrados = datos.equipos_cerrito.map(eq => ({
            nombre: eq.nombre,
            cantidad_camaras: eq.cantidad_camaras,
            region: 'CERRITO',
            color: '#8B00FF'
        }));
    }
    
    // Combinar sucursales y equipos de Cerrito
    let datosGrafico = [...sucursalesFiltradas, ...equiposCerritoFiltrados];

    // Ordenar por cantidad de cámaras (descendente)
    datosGrafico = datosGrafico.sort((a, b) => (b.cantidad_camaras || 0) - (a.cantidad_camaras || 0));

    const coloresRegion = {
        'CERRITO': '#8B00FF',
        'San Juan': '#FFFF00',
        'Santa Cruz': '#0070C0',
        'Entre Rios': '#FF0000',
        'Santa Fe': '#00B050'
    };

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datosGrafico.map(s => s.nombre),
            datasets: [{
                label: 'Cantidad de Cámaras',
                data: datosGrafico.map(s => s.cantidad_camaras || 0),
                backgroundColor: datosGrafico.map(s => coloresRegion[s.region] || '#999999'),
                borderColor: '#333',
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

    const coloresRegion = {
        'CERRITO': '#8B00FF',
        'San Juan': '#FFFF00',
        'Santa Cruz': '#0070C0',
        'Entre Rios': '#FF0000',
        'Santa Fe': '#00B050'
    };

    // Central Principal
    const centralPrincipal = datos.central_principal;
    const nodoPrincipal = document.createElement('div');
    nodoPrincipal.className = 'topology-node principal';
    nodoPrincipal.innerHTML = `
        <div class="topology-node-title">🔴 ${centralPrincipal.nombre}</div>
        <div class="topology-node-info"><strong>IP:</strong> ${centralPrincipal.ip}</div>
        <div class="topology-node-info"><strong>Cámaras Totales:</strong> ${calcularCamarasCerrito() + datos.centrales_regionales.reduce((sum, c) => sum + calcularCamarasPorCentral(c.nombre), 0)}</div>
    `;
    container.appendChild(nodoPrincipal);

    // Equipos de Cerrito
    if (datos.equipos_cerrito.length > 0) {
        const childrenCerrito = document.createElement('div');
        childrenCerrito.className = 'topology-children';
        
        datos.equipos_cerrito.forEach(eq => {
            const child = document.createElement('div');
            child.className = 'topology-child';
            child.style.borderLeftColor = coloresRegion['CERRITO'];
            child.innerHTML = `
                <div class="topology-node-title">📹 ${eq.nombre}</div>
                <div class="topology-node-info"><strong>IP:</strong> ${eq.ip}</div>
                <div class="topology-node-info"><strong>Cámaras:</strong> ${eq.cantidad_camaras || 0}</div>
            `;
            childrenCerrito.appendChild(child);
        });
        
        container.appendChild(childrenCerrito);
    }

    // Centrales Regionales
    datos.centrales_regionales.forEach(central => {
        const nodo = document.createElement('div');
        nodo.className = 'topology-node';
        nodo.style.borderLeftColor = coloresRegion[central.region] || '#999999';
        nodo.style.borderColor = coloresRegion[central.region] || '#999999';
        
        const cantidadSucursales = datos.sucursales.filter(s => s.conectada_a_central === central.nombre).length;
        const cantidadCamaras = calcularCamarasPorCentral(central.nombre);
        
        nodo.innerHTML = `
            <div class="topology-node-title">🔵 ${central.nombre}</div>
            <div class="topology-node-info"><strong>Región:</strong> ${central.region}</div>
            <div class="topology-node-info"><strong>IP:</strong> ${central.ip}</div>
            <div class="topology-node-info"><strong>Sucursales:</strong> ${cantidadSucursales}</div>
            <div class="topology-node-info"><strong>Cámaras:</strong> ${cantidadCamaras}</div>
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
                child.style.borderLeftColor = coloresRegion[sucursal.region] || '#999999';
                child.innerHTML = `
                    <div class="topology-node-title">🏢 ${sucursal.nombre}</div>
                    <div class="topology-node-info"><strong>NVRs:</strong> ${datos.nvrs.filter(n => n.conectado_a === sucursal.nombre).length}</div>
                    <div class="topology-node-info"><strong>Cámaras:</strong> ${sucursal.cantidad_camaras || 0}</div>
                `;
                children.appendChild(child);
            });
            
            container.appendChild(children);
        }
    });
}

// Llenar tabla de sucursales
function llenarTabla() {
    const tbody = document.getElementById('tablaSucursales');
    tbody.innerHTML = '';

    const coloresRegion = {
        'CERRITO': '#8B00FF',
        'San Juan': '#FFFF00',
        'Santa Cruz': '#0070C0',
        'Entre Rios': '#FF0000',
        'Santa Fe': '#00B050'
    };

    // Agregar equipos locales de Cerrito
    datos.equipos_cerrito.forEach(eq => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eq.nombre}</td>
            <td>CERRITO</td>
            <td>-</td>
            <td>${eq.cantidad_camaras || 0}</td>
            <td>-</td>
            <td><span class="badge" style="background-color: ${coloresRegion['CERRITO']}; color: #fff;">HikCentral Cerrito</span></td>
        `;
        tbody.appendChild(row);
    });

    // Agregar sucursales
    datos.sucursales.forEach(sucursal => {
        const row = document.createElement('tr');
        const cantidadNvrs = datos.nvrs.filter(n => n.conectado_a === sucursal.nombre).length;
        
        row.innerHTML = `
            <td>${sucursal.nombre}</td>
            <td>${sucursal.region}</td>
            <td>${cantidadNvrs}</td>
            <td>${sucursal.cantidad_camaras || 0}</td>
            <td>${sucursal.tamaño_vinculo || 'N/A'}</td>
            <td><span class="badge" style="background-color: ${coloresRegion[sucursal.region] || '#999999'}; color: ${sucursal.region === 'San Juan' ? '#000' : '#fff'};">${sucursal.conectada_a_central}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    // Agregar funcionalidad de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filtrarTabla);
    }
}

// Filtrar tabla de búsqueda
function filtrarTabla() {
    const input = document.getElementById('searchInput');
    const filter = input.value.toLowerCase();
    const table = document.querySelector('table tbody');
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        let found = false;
        
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].textContent.toLowerCase().includes(filter)) {
                found = true;
                break;
            }
        }
        
        rows[i].style.display = found ? '' : 'none';
    }
}

// Cargar datos al iniciar
cargarDatos();
