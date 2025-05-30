import { Card, CardBody, CardHeader, Col, FormGroup, Input, InputGroup, InputGroupText, Label, Row, Table, Button } from "reactstrap";
import Swal from 'sweetalert2';
import Autosuggest from 'react-autosuggest';
import { useContext, useState } from "react";
import { UserContext } from "../context/UserProvider";
import "./css/Venta.css";
//---
import React, { useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

// Componente principal de la vista de ventas
const Venta = () => {
    const { user } = useContext(UserContext);
    // Estado para gestionar productos sugeridos y búsqueda de productos
    const [a_Productos, setA_Productos] = useState([]);
    const [a_Busqueda, setA_Busqueda] = useState("");
    // Estado para almacenar la información del cliente (documento y nombre)
    const [documentoCliente, setDocumentoCliente] = useState("");
    const [nombreCliente, setNombreCliente] = useState("");
    // Estado para gestionar los detalles de la venta: tipo de documento, productos seleccionados y totales
    const [tipoDocumento, setTipoDocumento] = useState("Boleta");
    const [productos, setProductos] = useState([]);
    const [total, setTotal] = useState(0);
    const [subTotal, setSubTotal] = useState(0);
    const [igv, setIgv] = useState(0);
    const [previewImg, setPreviewImg] = useState(null);
    //-----
    // Estado para controlar el modal del producto escaneado
    const [mostrarModal, setMostrarModal] = useState(false);
    const [productoEscaneado, setProductoEscaneado] = useState(null);
    const [cantidadProducto, setCantidadProducto] = useState(1);

    //------------
    //--Codigo nuevo de escanear producto
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [producto, setProducto] = useState(null);

    const iniciarCamara = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
    };

    // Función actualizada para capturar imagen
    const capturarImagen = async () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!video || !canvas) {
            Swal.fire('Error', 'Cámara no inicializada', 'error');
            return;
        }

        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 224, 224);

        // Mostrar loading
        Swal.fire({
            title: 'Escaneando producto...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'captura.jpg');

            try {
                const res = await fetch('http://127.0.0.1:5000/predict', {
                    method: 'POST',
                    body: formData
                });

                Swal.close(); // Cerrar loading

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();

                if (data.success && data.producto) {
                    // Producto encontrado - mostrar modal
                    setProductoEscaneado(data.producto);
                    setMostrarModal(true);
                    setCantidadProducto(1);

                    // Opcional: mostrar confianza si es baja
                    if (data.confidence < 0.7) {
                        console.warn(`Confianza baja: ${data.confidence}`);
                    }
                } else {
                    // Producto no encontrado
                    Swal.fire({
                        title: 'Producto no encontrado',
                        text: data.message || 'El producto escaneado no está en la base de datos',
                        icon: 'warning',
                        footer: data.clase_detectada ?
                            `Detectado: "${data.clase_detectada}" (Confianza: ${(data.confidence * 100).toFixed(1)}%)` : '',
                        confirmButtonText: 'Intentar de nuevo'
                    });
                }

            } catch (err) {
                Swal.close(); // Cerrar loading
                console.error('Error al hacer fetch:', err);
                Swal.fire({
                    title: 'Error de conexión',
                    text: 'No se pudo conectar con la API de reconocimiento. Verifique que el servidor esté ejecutándose.',
                    icon: 'error',
                    footer: 'URL: http://127.0.0.1:5000/predict'
                });
            }
        }, 'image/jpeg');
    }

    // Función para agregar el producto escaneado a la venta
    const agregarProductoEscaneado = () => {
        if (!cantidadProducto || cantidadProducto <= 0) {
            Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error');
            return;
        }

        if (cantidadProducto > productoEscaneado.stock) {
            Swal.fire('Stock insuficiente', `Solo hay ${productoEscaneado.stock} unidades disponibles`, 'warning');
            return;
        }

        // Verificar si el producto ya está en la lista
        const productoExistente = productos.find(p => p.idProducto === productoEscaneado.idProducto);

        if (productoExistente) {
            Swal.fire({
                title: 'Producto ya agregado',
                text: '¿Desea aumentar la cantidad?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, aumentar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Aumentar cantidad del producto existente
                    const nuevosProductos = productos.map(p => {
                        if (p.idProducto === productoEscaneado.idProducto) {
                            const nuevaCantidad = p.cantidad + parseInt(cantidadProducto);
                            return {
                                ...p,
                                cantidad: nuevaCantidad,
                                total: p.precio * nuevaCantidad
                            };
                        }
                        return p;
                    });

                    setProductos(nuevosProductos);
                    calcularTotal(nuevosProductos);
                    cerrarModal();
                    Swal.fire('¡Éxito!', 'Cantidad actualizada correctamente', 'success');
                }
            });
        } else {
            // Agregar nuevo producto
            const nuevoProducto = {
                idProducto: productoEscaneado.idProducto,
                descripcion: productoEscaneado.descripcion,
                cantidad: parseInt(cantidadProducto),
                precio: productoEscaneado.precio,
                total: productoEscaneado.precio * parseInt(cantidadProducto)
            };

            const nuevosProductos = [...productos, nuevoProducto];
            setProductos(nuevosProductos);
            calcularTotal(nuevosProductos);
            cerrarModal();
            Swal.fire('¡Éxito!', 'Producto agregado a la venta', 'success');
        }
    };
    
    //-------
    // Función para cerrar el modal
    const cerrarModal = () => {
        setMostrarModal(false);
        setProductoEscaneado(null);
        setCantidadProducto(1);
    };

        //--------------------------------------------------------


        // Función para reestablecer el estado inicial del formulario después de una venta
        const reestablecer = () => {
            setDocumentoCliente("");
            setNombreCliente("");
            setTipoDocumento("Boleta");
            setProductos([]);
            setTotal(0);
            setSubTotal(0);
            setIgv(0);
        };

        // Función para buscar productos en la API mientras el usuario escribe en el campo de búsqueda
        const onSuggestionsFetchRequested = ({ value }) => {
            fetch("api/venta/Productos/" + value)
                .then(response => response.json())
                .then(dataJson => {
                    setA_Productos(dataJson);
                });
        };

        const onSuggestionsClearRequested = () => {
            setA_Productos([]);
        };

        const getSuggestionValue = (sugerencia) => {
            return sugerencia.codigo + " - " + sugerencia.marca + " - " + sugerencia.descripcion;
        };

        const renderSuggestion = (sugerencia) => (
            <span>{sugerencia.codigo} - {sugerencia.marca} - {sugerencia.descripcion}</span>
        );

        const onChange = (e, { newValue }) => {
            setA_Busqueda(newValue);
        };

        const inputProps = {
            placeholder: "Buscar producto",
            value: a_Busqueda,
            onChange
        };

        // Función que se ejecuta cuando se selecciona una sugerencia de producto
        const sugerenciaSeleccionada = (event, { suggestion }) => {
            // SweetAlert para solicitar la cantidad del producto seleccionado
            Swal.fire({
                title: `${suggestion.marca} - ${suggestion.descripcion}`,
                text: "Ingrese la cantidad",
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Volver',
                preConfirm: (inputValue) => {
                    if (isNaN(parseFloat(inputValue))) {
                        Swal.showValidationMessage("Debe ingresar un valor numérico");
                    } else {
                        let producto = {
                            idProducto: suggestion.idProducto,
                            descripcion: suggestion.descripcion,
                            cantidad: parseInt(inputValue),
                            precio: suggestion.precio,
                            total: suggestion.precio * parseFloat(inputValue)
                        };
                        setProductos([...productos, producto]);
                        calcularTotal([...productos, producto]);
                    }
                }
            }).then(() => {
                setA_Busqueda("");
            });
        };

        // Función para eliminar un producto de la lista
        const eliminarProducto = (id) => {
            let listaProductos = productos.filter(p => p.idProducto !== id);
            setProductos(listaProductos);
            calcularTotal(listaProductos);
        };

        // Función para calcular el total de la venta, incluyendo subtotales e impuestos
        const calcularTotal = (arrayProductos) => {
            let t = 0, st = 0, imp = 0;
            arrayProductos.forEach(p => {
                t += p.total;
            });
            st = t / 1.12;
            imp = t - st;
            setSubTotal(st.toFixed(2));
            setIgv(imp.toFixed(2));
            setTotal(t.toFixed(2));
        };
        // Función para finalizar la venta, enviando los datos al servidor
        const terminarVenta = () => {
            if (productos.length < 1) {
                Swal.fire('Opps!', 'No existen productos', 'error');
                return;
            }

            // Creamos un objeto venta con la información ingresada
            let venta = {
                documentoCliente: documentoCliente,
                nombreCliente: nombreCliente,
                tipoDocumento: tipoDocumento,
                idUsuario: JSON.parse(user).idUsuario,
                subTotal: parseFloat(subTotal),
                igv: parseFloat(igv),
                total: parseFloat(total),
                listaProductos: productos
            };

            fetch("api/venta/Registrar", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(venta)
            }).then(response => response.json())
                .then(dataJson => {
                    reestablecer();
                    Swal.fire('Venta Creada!', 'Número de venta: ' + dataJson.numeroDocumento, 'success');
                }).catch(error => {
                    Swal.fire('Opps!', 'No se pudo crear la venta', 'error');
                });
        };

        // Renderizamos la interfaz del componente de ventas
        return (
            <Row>
                <Col sm={8}>
                    <Row className="mb-2">
                        <Col sm={12}>
                            <Card>
                                <CardHeader style={{ backgroundColor: '#4e73df', color: "white" }}>Cliente</CardHeader>
                                <CardBody>
                                    <Row>
                                        <Col sm={6}>
                                            <FormGroup>
                                                <Label>Nro Documento</Label>
                                                <Input bsSize="sm" value={documentoCliente} onChange={(e) => setDocumentoCliente(e.target.value)} />
                                            </FormGroup>
                                        </Col>
                                        <Col sm={6}>
                                            <FormGroup>
                                                <Label>Nombre</Label>
                                                <Input bsSize="sm" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={12}>
                            <Card>
                                <CardHeader style={{ backgroundColor: '#4e73df', color: "white" }}>Productos</CardHeader>
                                <CardBody>
                                    <Row className="mb-2">
                                        <Col sm={12}>
                                            <FormGroup>
                                                <Autosuggest
                                                    suggestions={a_Productos}
                                                    onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                                                    onSuggestionsClearRequested={onSuggestionsClearRequested}
                                                    getSuggestionValue={getSuggestionValue}
                                                    renderSuggestion={renderSuggestion}
                                                    inputProps={inputProps}
                                                    onSuggestionSelected={sugerenciaSeleccionada}
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <div className="p-4 border rounded-lg shadow">
                                        <h2 className="text-xl font-bold mb-2">Escanear Producto</h2>

                                        <video ref={videoRef} className="mb-2 w-56 h-56 border" />
                                        <canvas ref={canvasRef} className="hidden" />

                                        <div className="space-x-2">
                                            <button onClick={iniciarCamara} className="px-4 py-2 bg-red-500 text-black rounded">Activar Cámara</button>
                                            <button onClick={capturarImagen} className="px-4 py-2 bg-red-500 text-black rounded">Escanear Producto</button>
                                        </div>

                                    </div>

                                    <Row>
                                        <Col sm={12}>
                                            <Table striped size="sm">
                                                <thead>
                                                    <tr>
                                                        <th></th>
                                                        <th>Producto</th>
                                                        <th>Cantidad</th>
                                                        <th>Precio</th>
                                                        <th>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        productos.length < 1 ? (
                                                            <tr><td colSpan="5">Sin productos</td></tr>
                                                        ) : (
                                                            productos.map((item) => (
                                                                <tr key={item.idProducto}>
                                                                    <td>
                                                                        <Button color="danger" size="sm" onClick={() => eliminarProducto(item.idProducto)}>
                                                                            <i className="fas fa-trash-alt"></i>
                                                                        </Button>
                                                                    </td>
                                                                    <td>{item.descripcion}</td>
                                                                    <td>{item.cantidad}</td>
                                                                    <td>{item.precio}</td>
                                                                    <td>{item.total}</td>
                                                                </tr>
                                                            ))
                                                        )
                                                    }
                                                </tbody>
                                            </Table>
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                <Col sm={4}>
                    <Row className="mb-2">
                        <Col sm={12}>
                            <Card>
                                <CardHeader style={{ backgroundColor: '#4e73df', color: "white" }}>Detalle</CardHeader>
                                <CardBody>
                                    <Row className="mb-2">
                                        <Col sm={12}>
                                            <InputGroup size="sm">
                                                <InputGroupText>Tipo:</InputGroupText>
                                                <Input type="select" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                                                    <option value="Boleta">Boleta</option>
                                                    <option value="Factura">Factura</option>
                                                </Input>
                                            </InputGroup>
                                        </Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col sm={12}>
                                            <InputGroup size="sm">
                                                <InputGroupText>Sub Total:</InputGroupText>
                                                <Input disabled value={subTotal} />
                                            </InputGroup>
                                        </Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col sm={12}>
                                            <InputGroup size="sm">
                                                <InputGroupText>IVA (12%):</InputGroupText>
                                                <Input disabled value={igv} />
                                            </InputGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={12}>
                                            <InputGroup size="sm">
                                                <InputGroupText>Total:</InputGroupText>
                                                <Input disabled value={total} />
                                            </InputGroup>
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={12}>
                            <Card>
                                <CardBody>
                                    <Button color="success" block onClick={terminarVenta}>
                                        <i className="fas fa-money-check"></i> Terminar Venta
                                    </Button>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                <Modal isOpen={mostrarModal} toggle={cerrarModal} centered size="md">
                    <ModalHeader toggle={cerrarModal} className="bg-primary text-white">
                        <i className="fas fa-barcode me-2"></i>
                        {productoEscaneado?.marca || 'Producto'} - {productoEscaneado?.descripcion || 'Detectado'}
                    </ModalHeader>
                    <ModalBody>
                        {productoEscaneado && (
                            <div>
                                <Row className="mb-3">
                                    <Col sm={4}><strong>Código:</strong></Col>
                                    <Col sm={8}>{productoEscaneado.codigo}</Col>
                                </Row>
                                <Row className="mb-3">
                                    <Col sm={4}><strong>Marca:</strong></Col>
                                    <Col sm={8}>{productoEscaneado.marca}</Col>
                                </Row>
                                <Row className="mb-3">
                                    <Col sm={4}><strong>Descripción:</strong></Col>
                                    <Col sm={8}>{productoEscaneado.descripcion}</Col>
                                </Row>
                                <Row className="mb-3">
                                    <Col sm={4}><strong>Precio:</strong></Col>
                                    <Col sm={8}>${productoEscaneado.precio}</Col>
                                </Row>
                                <Row className="mb-3">
                                    <Col sm={4}><strong>Stock disponible:</strong></Col>
                                    <Col sm={8}>{productoEscaneado.stock} unidades</Col>
                                </Row>
                                <hr />
                                <FormGroup>
                                    <Label><strong>Ingrese la cantidad</strong></Label>
                                    <Input
                                        type="number"
                                        value={cantidadProducto}
                                        onChange={(e) => setCantidadProducto(e.target.value)}
                                        min="1"
                                        max={productoEscaneado.stock}
                                        placeholder="Cantidad"
                                        className="form-control-lg"
                                    />
                                    <small className="text-muted">
                                        Máximo: {productoEscaneado.stock} unidades
                                    </small>
                                </FormGroup>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="primary" size="lg" onClick={agregarProductoEscaneado}>
                            <i className="fas fa-check me-2"></i>
                            Aceptar
                        </Button>
                        <Button color="secondary" size="lg" onClick={cerrarModal}>
                            <i className="fas fa-times me-2"></i>
                            Volver
                        </Button>
                    </ModalFooter>
                </Modal>

            </Row>
        );
    };
export default Venta;
