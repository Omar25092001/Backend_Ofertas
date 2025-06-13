import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Obtener ruta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Iniciando proceso de seed...');
  
  // 1. Crear categorías
  const categorias = [
    { nombre_categoria: 'Electrónica', descripcion_categoria: 'Productos electrónicos y tecnológicos' },
    { nombre_categoria: 'Alimentación', descripcion_categoria: 'Productos alimenticios' },
    { nombre_categoria: 'Hogar', descripcion_categoria: 'Productos para el hogar' },
    { nombre_categoria: 'Deportes', descripcion_categoria: 'Equipamiento deportivo' },
    { nombre_categoria: 'Bebidas', descripcion_categoria: 'Bebidas alcohólicas y no alcohólicas' }
  ];
  
  for (const categoria of categorias) {
    const categoriaExistente = await prisma.categoriaProducto.findFirst({
      where: { nombre_categoria: categoria.nombre_categoria }
    });
    
    if (!categoriaExistente) {
      await prisma.categoriaProducto.create({ data: categoria });
      console.log(`Categoría creada: ${categoria.nombre_categoria}`);
    } else {
      console.log(`Categoría existente: ${categoria.nombre_categoria}`);
    }
  }
  
  // 2. Crear supermercados
  const supermercados = [
    { nombre_supermercado: 'Totus', url_sitio_web: 'https://www.totus.es' },
    { nombre_supermercado: 'econo', url_sitio_web: 'https://www.econo.es' },
    { nombre_supermercado: 'supermercado 9', url_sitio_web: 'https://www.supermercado9.es' },
    { nombre_supermercado: 'santa isabel', url_sitio_web: 'https://www.santaisabel.es' },
    { nombre_supermercado: 'don pepe', url_sitio_web: 'https://www.don pepe.es' }
  ];
  
  for (const supermercado of supermercados) {
    const supermercadoExistente = await prisma.supermercado.findFirst({
      where: { nombre_supermercado: supermercado.nombre_supermercado }
    });
    
    if (!supermercadoExistente) {
      await prisma.supermercado.create({ data: supermercado });
      console.log(`Supermercado creado: ${supermercado.nombre_supermercado}`);
    } else {
      console.log(`Supermercado existente: ${supermercado.nombre_supermercado}`);
    }
  }
  
  // 3. Obtener IDs de categorías y supermercados
  const categoriasDB = await prisma.categoriaProducto.findMany();
  const supermercadosDB = await prisma.supermercado.findMany();
  
  const categoriasPorNombre = categoriasDB.reduce((acc, cat) => {
    acc[cat.nombre_categoria] = cat.id_categoria;
    return acc;
  }, {});
  
  const supermercadosPorNombre = supermercadosDB.reduce((acc, sup) => {
    acc[sup.nombre_supermercado] = sup.id_supermercado;
    return acc;
  }, {});
  
  // 4. Crear productos
  const productos = [
    // Electrónica
    { 
      nombre_producto: 'Smartphone Samsung Galaxy S21', 
      marca: 'Samsung', 
      descripcion_producto: 'Smartphone de última generación con pantalla AMOLED',
      imagen_url: 'https://example.com/images/galaxy-s21.jpg',
      id_categoria: categoriasPorNombre['Electrónica']
    },
    { 
      nombre_producto: 'Televisor LG OLED 55"', 
      marca: 'LG', 
      descripcion_producto: 'TV OLED con resolución 4K',
      imagen_url: 'https://example.com/images/lg-oled.jpg',
      id_categoria: categoriasPorNombre['Electrónica']
    },
    { 
      nombre_producto: 'Portátil HP Pavilion', 
      marca: 'HP', 
      descripcion_producto: 'Portátil con procesador Intel i7 y 16GB RAM',
      imagen_url: 'https://example.com/images/hp-pavilion.jpg',
      id_categoria: categoriasPorNombre['Electrónica']
    },
    
    // Alimentación
    { 
      nombre_producto: 'Arroz Brillante', 
      marca: 'Brillante', 
      descripcion_producto: 'Arroz de grano largo, paquete de 1kg',
      imagen_url: 'https://example.com/images/arroz-brillante.jpg',
      id_categoria: categoriasPorNombre['Alimentación']
    },
    { 
      nombre_producto: 'Aceite de Oliva Virgen Extra', 
      marca: 'Carbonell', 
      descripcion_producto: 'Aceite de oliva virgen extra, botella de 1L',
      imagen_url: 'https://example.com/images/aceite-carbonell.jpg',
      id_categoria: categoriasPorNombre['Alimentación']
    },
    
    // Hogar
    { 
      nombre_producto: 'Aspiradora Dyson V11', 
      marca: 'Dyson', 
      descripcion_producto: 'Aspiradora sin cable con tecnología ciclónica',
      imagen_url: 'https://example.com/images/dyson-v11.jpg',
      id_categoria: categoriasPorNombre['Hogar']
    },
    
    // Deportes
    { 
      nombre_producto: 'Zapatillas Running Nike Air Zoom', 
      marca: 'Nike', 
      descripcion_producto: 'Zapatillas de running con amortiguación Air',
      imagen_url: 'https://example.com/images/nike-air-zoom.jpg',
      id_categoria: categoriasPorNombre['Deportes']
    },
    
    // Bebidas
    { 
      nombre_producto: 'Cerveza Mahou 5 Estrellas Pack 6', 
      marca: 'Mahou', 
      descripcion_producto: 'Pack de 6 cervezas de 33cl',
      imagen_url: 'https://example.com/images/mahou-5estrellas.jpg',
      id_categoria: categoriasPorNombre['Bebidas']
    },
    { 
      nombre_producto: 'Refresco Coca-Cola Pack 6', 
      marca: 'Coca-Cola', 
      descripcion_producto: 'Pack de 6 latas de Coca-Cola de 33cl',
      imagen_url: 'https://example.com/images/cocacola-pack.jpg',
      id_categoria: categoriasPorNombre['Bebidas']
    }
  ];
  
  const productosCreados = [];
  
  for (const producto of productos) {
    const productoExistente = await prisma.producto.findFirst({
      where: { 
        nombre_producto: producto.nombre_producto,
        marca: producto.marca
      }
    });
    
    if (!productoExistente) {
      const creado = await prisma.producto.create({ data: producto });
      console.log(`Producto creado: ${producto.nombre_producto}`);
      productosCreados.push(creado);
    } else {
      console.log(`Producto existente: ${producto.nombre_producto}`);
      productosCreados.push(productoExistente);
    }
  }
  
  // 5. Crear ofertas
  const hoy = new Date();
  const tresDiasAntes = new Date(hoy);
  tresDiasAntes.setDate(hoy.getDate() - 3);
  
  const diezDiasDespues = new Date(hoy);
  diezDiasDespues.setDate(hoy.getDate() + 10);
  
  for (const producto of productosCreados) {
    // Crear 1-3 ofertas para cada producto
    const numOfertas = Math.floor(Math.random() * 3) + 1;
    
    // Lista de supermercados sin repetir para este producto
    const supermercadosDisponibles = [...supermercadosDB];
    
    for (let i = 0; i < numOfertas && supermercadosDisponibles.length > 0; i++) {
      // Seleccionar un supermercado aleatorio
      const indiceSupermercado = Math.floor(Math.random() * supermercadosDisponibles.length);
      const supermercado = supermercadosDisponibles.splice(indiceSupermercado, 1)[0];
      
      // Generar precios aleatorios según la categoría
      let precioBase, descuento;
      
      switch (producto.id_categoria) {
        case categoriasPorNombre['Electrónica']:
          precioBase = Math.floor(Math.random() * 900) + 100; // 100-999
          descuento = Math.random() * 0.3 + 0.05; // 5-35% de descuento
          break;
        case categoriasPorNombre['Alimentación']:
          precioBase = Math.floor(Math.random() * 10) + 1; // 1-10
          descuento = Math.random() * 0.2 + 0.05; // 5-25% de descuento
          break;
        case categoriasPorNombre['Hogar']:
          precioBase = Math.floor(Math.random() * 200) + 20; // 20-219
          descuento = Math.random() * 0.25 + 0.05; // 5-30% de descuento
          break;
        case categoriasPorNombre['Deportes']:
          precioBase = Math.floor(Math.random() * 100) + 30; // 30-129
          descuento = Math.random() * 0.4 + 0.1; // 10-50% de descuento
          break;
        case categoriasPorNombre['Bebidas']:
          precioBase = Math.floor(Math.random() * 20) + 5; // 5-24
          descuento = Math.random() * 0.15 + 0.05; // 5-20% de descuento
          break;
        default:
          precioBase = Math.floor(Math.random() * 50) + 5; // 5-54
          descuento = Math.random() * 0.2 + 0.05; // 5-25% de descuento
      }
      
      const precioOriginal = parseFloat(precioBase.toFixed(2));
      const precioOferta = parseFloat((precioBase * (1 - descuento)).toFixed(2));
      
      const oferta = {
        precio_original: precioOriginal,
        precio_oferta: precioOferta,
        fecha_inicio_oferta: tresDiasAntes,
        fecha_fin_oferta: diezDiasDespues,
        descripcion_oferta: `¡Oferta especial en ${producto.nombre_producto}!`,
        url_oferta_original: `https://${supermercado.nombre_supermercado.toLowerCase()}.es/ofertas/${producto.id_producto}`,
        fecha_extraccion: hoy,
        valida: true,
        id_producto: producto.id_producto,
        id_supermercado: supermercado.id_supermercado
      };
      
      await prisma.oferta.create({ data: oferta });
      console.log(`Oferta creada: ${producto.nombre_producto} a ${precioOferta}€ en ${supermercado.nombre_supermercado}`);
    }
  }
  
  console.log('Proceso de seed completado exitosamente');
}

main()
  .catch(e => {
    console.error('Error durante el proceso de seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });