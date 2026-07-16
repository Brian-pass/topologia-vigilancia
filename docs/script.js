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
    const tabPanes = document.querySelectorAll('.tab-content');
    
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
    const regiones = new Set();
    
    datos.sucursales.forEach(s => regiones.add(s.region));
    regiones.add('CERRITO');
    
    Array.from(regiones).sort().forEach(region => {
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
    if (camarasCerrito > 0) {
        datosGrafico.push({
            label: 'CERRITO',
            value: camarasCerrito,
            color: coloresRegion['CERRITO']
        });
    }
    
    // Agregar centrales regionales
    datos.centrales_regionales.forEach(central => {
        const camaras = calcularCamarasPorCentral(central.nombre);
        if (camaras > 0) {
            datosGrafico.push({
                label: central.region,
                value: camaras,
                color: coloresRegion[central.region] || '#999999'
            });
        }
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
                    beginAtZero: true
                }
            }
        }
    });
}

// TOPOLOGÍA JERÁRQUICA EXPANDIBLE - VERSIÓN SIMPLIFICADA
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

    // Central Principal (Cerrito) - EXPANDIBLE
    const centralPrincipal = datos.central_principal;
    const totalCamarasCerrito = calcularCamarasCerrito();
    
    const cerritoDiv = document.createElement('div');
    cerritoDiv.style.cssText = `
        text-align: center;
        margin-bottom: 40px;
    `;
    
    const cerritoCard = document.createElement('div');
    cerritoCard.style.cssText = `
        border: 3px solid #8B00FF;
        border-radius: 8px;
        padding: 20px;
        background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
        max-width: 300px;
        margin: 0 auto;
        transition: all 0.3s ease;
    `;
    cerritoCard.onmouseover = () => cerritoCard.style.boxShadow = '0 8px 16px rgba(139, 0, 255, 0.3)';
    cerritoCard.onmouseout = () => cerritoCard.style.boxShadow = 'none';
    
    const titleCerritoId = 'title-cerrito';
    const listCerritoId = 'list-cerrito';
    
    cerritoCard.innerHTML = `
        <h3 id="${titleCerritoId}" style="color: #8B00FF; margin: 0 0 10px 0; cursor: pointer; user-select: none;">▶ ${centralPrincipal.nombre}</h3>
        <p style="margin: 5px 0;"><strong>IP:</strong> ${centralPrincipal.ip}</p>
        <p style="margin: 5px 0;"><strong>NVRs Locales:</strong> ${datos.equipos_cerrito.length}</p>
        <p style="margin: 5px 0;"><strong>Cámaras Locales:</strong> ${totalCamarasCerrito}</p>
        <div id="${listCerritoId}" style="display: none; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;"></div>
    `;
    cerritoDiv.appendChild(cerritoCard);
    container.appendChild(cerritoDiv);
    
    // Agregar evento de click a Cerrito
    const titleCerrito = document.getElementById(titleCerritoId);
    const listCerrito = document.getElementById(listCerritoId);
    
    titleCerrito.addEventListener('click', function() {
        if (listCerrito.style.display === 'none') {
            listCerrito.style.display = 'block';
            titleCerrito.textContent = '▼ ' + centralPrincipal.nombre;
            llenarEquiposCerritoExpandibles(listCerrito, coloresRegion);
        } else {
            listCerrito.style.display = 'none';
            titleCerrito.textContent = '▶ ' + centralPrincipal.nombre;
        }
    });

    // Centrales Regionales
    const centralesDiv = document.createElement('div');
    centralesDiv.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
        width: 100%;
        margin-top: 20px;
    `;

    datos.centrales_regionales.forEach((central, idx) => {
        const centralDiv = document.createElement('div');
        centralDiv.id = 'central-' + idx;
        centralDiv.style.cssText = `
            border: 3px solid ${coloresRegion[central.region]};
            border-radius: 8px;
            padding: 20px;
            background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
            transition: all 0.3s ease;
        `;
        centralDiv.onmouseover = () => centralDiv.style.boxShadow = `0 8px 16px rgba(${hexToRgb(coloresRegion[central.region])}, 0.3)`;
        centralDiv.onmouseout = () => centralDiv.style.boxShadow = 'none';

        const cantidadSucursales = datos.sucursales.filter(s => s.conectada_a_central === central.nombre).length;
        const cantidadCamaras = calcularCamarasPorCentral(central.nombre);

        const titleId = 'title-central-' + idx;
        const listId = 'list-central-' + idx;

        centralDiv.innerHTML = `
            <h3 id="${titleId}" style="color: ${coloresRegion[central.region]}; margin: 0 0 10px 0; cursor: pointer; user-select: none;">
                ▶ ${central.nombre}
            </h3>
            <p style="margin: 5px 0;"><strong>Región:</strong> ${central.region}</p>
            <p style="margin: 5px 0;"><strong>IP:</strong> ${central.ip}</p>
            <p style="margin: 5px 0;"><strong>Sucursales:</strong> ${cantidadSucursales}</p>
            <p style="margin: 5px 0;"><strong>Cámaras:</strong> ${cantidadCamaras}</p>
            <div id="${listId}" style="display: none; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;"></div>
        `;

        centralesDiv.appendChild(centralDiv);

        // Agregar evento de click al título
        const title = document.getElementById(titleId);
        const listContainer = document.getElementById(listId);
        
        title.addEventListener('click', function() {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                title.textContent = '▼ ' + central.nombre;
                llenarSucursalesExpandibles(central.nombre, listContainer, coloresRegion);
            } else {
                listContainer.style.display = 'none';
                title.textContent = '▶ ' + central.nombre;
            }
        });
    });

    container.appendChild(centralesDiv);
}

// Función auxiliar para convertir hex a rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
}

// Función para llenar sucursales expandibles
function llenarSucursalesExpandibles(nombreCentral, container, coloresRegion) {
    container.innerHTML = '';
    const sucursalesDelaCentral = datos.sucursales.filter(s => s.conectada_a_central === nombreCentral);

    sucursalesDelaCentral.forEach((sucursal, idx) => {
        const nvrCount = datos.nvrs.filter(n => n.conectado_a === sucursal.nombre).length;
        
        const titleId = 'title-sucursal-' + nombreCentral + '-' + idx;
        const listId = 'list-sucursal-' + nombreCentral + '-' + idx;

        const sucursalDiv = document.createElement('div');
        sucursalDiv.style.cssText = `
            border-left: 3px solid ${coloresRegion[sucursal.region]};
            padding: 10px;
            margin-bottom: 10px;
            background: #f9f9f9;
            border-radius: 4px;
        `;

        sucursalDiv.innerHTML = `
            <div id="${titleId}" style="cursor: pointer; font-weight: bold; color: ${coloresRegion[sucursal.region]}; user-select: none;">
                ▶ ${sucursal.nombre}
            </div>
            <div style="margin-top: 5px; font-size: 0.9em;">
                <p style="margin: 2px 0;"><strong>NVRs:</strong> ${nvrCount}</p>
                <p style="margin: 2px 0;"><strong>Cámaras:</strong> ${sucursal.cantidad_camaras || 0}</p>
            </div>
            <div id="${listId}" style="display: none; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;"></div>
        `;

        container.appendChild(sucursalDiv);

        // Agregar evento de click
        const title = document.getElementById(titleId);
        const listContainer = document.getElementById(listId);
        
        title.addEventListener('click', function() {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                title.textContent = '▼ ' + sucursal.nombre;
                llenarNvrsExpandibles(sucursal.nombre, listContainer, coloresRegion);
            } else {
                listContainer.style.display = 'none';
                title.textContent = '▶ ' + sucursal.nombre;
            }
        });
    });
}

// Función para llenar NVRs expandibles
function llenarNvrsExpandibles(nombreSucursal, container, coloresRegion) {
    container.innerHTML = '';
    const nvrsDelaSucursal = datos.nvrs.filter(n => n.conectado_a === nombreSucursal);

    nvrsDelaSucursal.forEach((nvr, idx) => {
        const camarasCount = datos.camaras.filter(c => c.conectada_a_nvr === nvr.nombre).length;
        
        const titleId = 'title-nvr-' + nombreSucursal + '-' + idx;
        const listId = 'list-nvr-' + nombreSucursal + '-' + idx;

        const nvrDiv = document.createElement('div');
        nvrDiv.style.cssText = `
            border-left: 3px solid #666;
            padding: 8px;
            margin-bottom: 8px;
            background: #f0f0f0;
            border-radius: 4px;
        `;

        nvrDiv.innerHTML = `
            <div id="${titleId}" style="cursor: pointer; font-weight: bold; color: #333; user-select: none;">
                ▶ ${nvr.nombre}
            </div>
            <div style="margin-top: 5px; font-size: 0.85em;">
                <p style="margin: 2px 0;"><strong>IP:</strong> ${nvr.ip}</p>
                <p style="margin: 2px 0;"><strong>Cámaras:</strong> ${camarasCount}</p>
            </div>
            <div id="${listId}" style="display: none; margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px;"></div>
        `;

        container.appendChild(nvrDiv);

        // Agregar evento de click
        const title = document.getElementById(titleId);
        const listContainer = document.getElementById(listId);
        
        title.addEventListener('click', function() {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                title.textContent = '▼ ' + nvr.nombre;
                llenarCamarasExpandibles(nvr.nombre, listContainer);
            } else {
                listContainer.style.display = 'none';
                title.textContent = '▶ ' + nvr.nombre;
            }
        });
    });
}

// Función para llenar cámaras expandibles
function llenarCamarasExpandibles(nombreNvr, container) {
    container.innerHTML = '';
    const camarasDelNvr = datos.camaras.filter(c => c.conectada_a_nvr === nombreNvr);

    camarasDelNvr.forEach(camara => {
        const camaraDiv = document.createElement('div');
        camaraDiv.style.cssText = `
            border-left: 3px solid #999;
            padding: 6px;
            margin-bottom: 6px;
            background: #efefef;
            border-radius: 3px;
            font-size: 0.85em;
        `;

        camaraDiv.innerHTML = `
            <p style="margin: 2px 0; font-weight: bold;">${camara.nombre}</p>
            <p style="margin: 2px 0;"><strong>IP:</strong> ${camara.ip}</p>
            <p style="margin: 2px 0;"><strong>Modelo:</strong> ${camara.modelo}</p>
            <p style="margin: 2px 0;"><strong>MAC:</strong> ${camara.mac}</p>
        `;

        container.appendChild(camaraDiv);
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

    // Agregar equipos locales de Cerrito como una fila consolidada
    if (datos.equipos_cerrito.length > 0) {
        const totalCamarasCerrito = datos.equipos_cerrito.reduce((sum, eq) => sum + (eq.cantidad_camaras || 0), 0);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>Equipos Locales Cerrito</strong></td>
            <td>CERRITO</td>
            <td>${datos.equipos_cerrito.length}</td>
            <td>${totalCamarasCerrito}</td>
            <td>-</td>
            <td><span class="badge" style="background-color: ${coloresRegion['CERRITO']}; color: #fff;">HikCentral Cerrito</span></td>
        `;
        tbody.appendChild(row);
    }

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

// Función para llenar equipos locales de Cerrito expandibles
function llenarEquiposCerritoExpandibles(container, coloresRegion) {
    container.innerHTML = '';
    
    datos.equipos_cerrito.forEach((equipo, idx) => {
        const titleId = 'title-equipo-' + idx;
        const listId = 'list-equipo-' + idx;
        
        const equipoDiv = document.createElement('div');
        equipoDiv.style.cssText = `
            border-left: 3px solid #8B00FF;
            padding: 10px;
            margin-bottom: 10px;
            background: #f9f9f9;
            border-radius: 4px;
        `;
        
        const camarasCount = equipo.cantidad_camaras || 0;
        
        equipoDiv.innerHTML = `
            <div id="${titleId}" style="cursor: pointer; font-weight: bold; color: #8B00FF; user-select: none;">
                ▶ ${equipo.nombre}
            </div>
            <div style="margin-top: 5px; font-size: 0.9em;">
                <p style="margin: 2px 0;"><strong>IP:</strong> ${equipo.ip}</p>
                <p style="margin: 2px 0;"><strong>Cámaras:</strong> ${camarasCount}</p>
            </div>
            <div id="${listId}" style="display: none; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;"></div>
        `;
        
        container.appendChild(equipoDiv);
        
        // Agregar evento de click
        const title = document.getElementById(titleId);
        const listContainer = document.getElementById(listId);
        
        title.addEventListener('click', function() {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                title.textContent = '▼ ' + equipo.nombre;
                llenarCamarasEquipoCerrito(equipo.nombre, listContainer);
            } else {
                listContainer.style.display = 'none';
                title.textContent = '▶ ' + equipo.nombre;
            }
        });
    });
}

// Función para llenar cámaras de equipos de Cerrito
function llenarCamarasEquipoCerrito(nombreEquipo, container) {
    container.innerHTML = '';
    const camarasDelEquipo = datos.camaras.filter(c => c.conectada_a_nvr === nombreEquipo);
    
    if (camarasDelEquipo.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 0.9em;">Sin cámaras conectadas</p>';
        return;
    }
    
    camarasDelEquipo.forEach(camara => {
        const camaraDiv = document.createElement('div');
        camaraDiv.style.cssText = `
            border-left: 3px solid #999;
            padding: 6px;
            margin-bottom: 6px;
            background: #efefef;
            border-radius: 3px;
            font-size: 0.85em;
        `;
        
        camaraDiv.innerHTML = `
            <p style="margin: 2px 0; font-weight: bold;">${camara.nombre}</p>
            <p style="margin: 2px 0;"><strong>IP:</strong> ${camara.ip}</p>
            <p style="margin: 2px 0;"><strong>Modelo:</strong> ${camara.modelo}</p>
            <p style="margin: 2px 0;"><strong>MAC:</strong> ${camara.mac}</p>
        `;
        
        container.appendChild(camaraDiv);
    });
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
