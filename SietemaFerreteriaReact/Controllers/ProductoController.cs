﻿using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactVentas.Models;

namespace ReactVentas.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductoController : ControllerBase
    {
        private readonly FERRETERIA_REACTContext _context;
        public ProductoController(FERRETERIA_REACTContext context)
        {
            _context = context;

        }

        //--------
        [HttpGet("nombre/{nombre}")]
        public async Task<IActionResult> ObtenerPorNombre(string nombre)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Descripcion.Contains(nombre));

            if (producto == null)
                return NotFound();

            return Ok(producto);
        }

        //-------

        [HttpGet]
        [Route("Lista")]
        public async Task<IActionResult> Lista()
        {
            List<Producto> lista = new List<Producto>();
            try
            {
                lista = await _context.Productos.Include(c => c.IdCategoriaNavigation).OrderByDescending(c => c.IdProducto).ToListAsync();

                return StatusCode(StatusCodes.Status200OK, lista);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, lista);
            }
        }

        [HttpPost]
        [Route("Guardar")]
        public async Task<IActionResult> Guardar([FromBody] Producto request)
        {
            try
            {
                await _context.Productos.AddAsync(request);
                await _context.SaveChangesAsync();

                return StatusCode(StatusCodes.Status200OK, "ok");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpPut]
        [Route("Editar")]
        public async Task<IActionResult> Editar([FromBody] Producto request)
        {
            try
            {
                _context.Productos.Update(request);
                await _context.SaveChangesAsync();

                return StatusCode(StatusCodes.Status200OK, "ok");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpDelete]
        [Route("Eliminar/{id:int}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            try
            {
                Producto usuario = _context.Productos.Find(id);
                _context.Productos.Remove(usuario);
                await _context.SaveChangesAsync();
                return StatusCode(StatusCodes.Status200OK, "ok");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }
    }
}
