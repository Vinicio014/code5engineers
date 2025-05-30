import { useEffect, useState } from "react";
import DataTable from 'react-data-table-component';
import { Card, CardBody, CardHeader, Button, Modal, ModalHeader, ModalBody, Label, Input, FormGroup, ModalFooter } from "reactstrap"
import Swal from 'sweetalert2'


// Objeto modelo para inicializar el estado de una categoría
const modeloCategoria = {
    idCategoria: 0,
    descripcion: "",
    esActivo: true
}

const Categoria = () => {
    // Estados principales del componente
    const [categoria, setCategoria] = useState(modeloCategoria);
    const [pendiente, setPendiente] = useState(true);
    const [categorias, setCategorias] = useState([]);
    const [categoriasInactivas, setCategoriasInactivas] = useState([]);
    const [mostrarInactivas, setMostrarInactivas] = useState(false); 
    const [verModal, setVerModal] = useState(false);

    const handleChange = (e) => {
        let value = e.target.nodeName === "SELECT" ? (e.target.value === "true" ? true : false) : e.target.value;

        setCategoria({
            ...categoria,
            [e.target.name]: value
        })
    }
    // Obtiene la lista de categorías activas desde el servidor
    const obtenerCategorias = async () => {
        let response = await fetch("api/categoria/Lista");

        if (response.ok) {
            let data = await response.json();
            let categoriasActivas = data.filter(categoria => categoria.esActivo === true); 
            setCategorias(categoriasActivas);
            setPendiente(false);
        }
    };
    // Obtiene la lista de categorías inactivas desde el servidor
    const obtenerCategoriasInactivas = async () => {
        let response = await fetch("api/categoria/Lista");

        if (response.ok) {
            let data = await response.json();
            let categoriasNoActivas = data.filter(categoria => categoria.esActivo === false); 
            setCategoriasInactivas(categoriasNoActivas);
            setPendiente(false);
        }
    };

    useEffect(() => {
        obtenerCategorias(); 
    }, []);

    // Configuración de las columnas para la tabla de categorías

    const columns = [
        {
            name: 'Descripcion',
            selector: row => row.descripcion,
            sortable: true,
        },
        {
            name: 'Estado',
            selector: row => row.esActivo,
            sortable: true,
            cell: row => {
                let clase = row.esActivo ? "badge badge-info p-2" : "badge badge-danger p-2";
                return (
                    <span className={clase}>{row.esActivo ? "Activo" : "No Activo"}</span>
                )
            }
        },
        {
            name: '',
            cell: row => (
                <>
                    <Button color="primary" size="sm" className="mr-2"
                        onClick={() => abrirEditarModal(row)}
                    >
                        <i className="fas fa-pen-alt"></i>
                    </Button>

                    <Button color="danger" size="sm"
                        onClick={() => eliminarCategoria(row.idCategoria)}
                    >
                        <i className="fas fa-trash-alt"></i>
                    </Button>
                </>
            ),
        },
    ];

    // Estilos personalizados para la tabla
    const customStyles = {
        headCells: {
            style: {
                fontSize: '13px',
                fontWeight: 800,
            },
        },
        headRow: {
            style: {
                backgroundColor: "#eee",
            }
        }
    };

    // Opciones de paginación para la tabla
    const paginationComponentOptions = {
        rowsPerPageText: 'Filas por página',
        rangeSeparatorText: 'de',
        selectAllRowsItem: true,
        selectAllRowsItemText: 'Todos',
    };

    const abrirEditarModal = (data) => {
        setCategoria(data);
        setVerModal(!verModal);
    }

    const cerrarModal = () => {
        setCategoria(modeloCategoria);
        setVerModal(!verModal);
    }
    // Guarda los cambios en una categoría (crea o edita según el caso)
    const guardarCambios = async () => {
        let response;
        if (categoria.idCategoria === 0) {
            response = await fetch("api/categoria/Guardar", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(categoria)
            });
        } else {
            response = await fetch("api/categoria/Editar", {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(categoria)
            });
        }

        if (response.ok) {
            mostrarInactivas ? await obtenerCategoriasInactivas() : await obtenerCategorias();
            setCategoria(modeloCategoria);
            setVerModal(!verModal);
        } else {
            alert("error al guardar");
        }
    }

    // Elimina una categoría con confirmación de SweetAlert
    const eliminarCategoria = async (id) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Deseas eliminar esta categoría",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'No, volver'
        }).then((result) => {
            if (result.isConfirmed) {
                const response = fetch("api/categoria/Eliminar/" + id, { method: "DELETE" })
                    .then(response => {
                        if (response.ok) {
                            mostrarInactivas ? obtenerCategoriasInactivas() : obtenerCategorias();
                            Swal.fire(
                                'Eliminado!',
                                'La categoría fue eliminada.',
                                'success'
                            );
                        }
                    });
            }
        });
    }

    return (
        <>
            <Card>
                <CardHeader style={{ backgroundColor: '#4e73df', color: "white" }}>
                    Lista de Categorías
                </CardHeader>
                <CardBody>
                    <Button color="success" size="sm" onClick={() => setVerModal(!verModal)}>Nueva Categoría</Button>
                    <Button
                        color="warning"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                            setMostrarInactivas(!mostrarInactivas);
                            mostrarInactivas ? obtenerCategorias() : obtenerCategoriasInactivas();
                        }}
                    >
                        {mostrarInactivas ? 'Ver Activas' : 'Ver No Activas'}
                    </Button>
                    <hr></hr>
                    <DataTable
                        columns={columns}
                        data={mostrarInactivas ? categoriasInactivas : categorias}
                        progressPending={pendiente}
                        pagination
                        paginationComponentOptions={paginationComponentOptions}
                        customStyles={customStyles}
                    />
                </CardBody>
            </Card>

            <Modal isOpen={verModal}>
                <ModalHeader>
                    Detalle Categoría
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label>Descripción</Label>
                        <Input bsSize="sm" name="descripcion" onChange={handleChange} value={categoria.descripcion} />
                    </FormGroup>
                    <FormGroup>
                        <Label>Estado</Label>
                        <Input bsSize="sm" type={"select"} name="esActivo" onChange={handleChange} value={categoria.esActivo} >
                            <option value={true}>Activo</option>
                            <option value={false}>No Activo</option>
                        </Input>
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button size="sm" color="primary" onClick={guardarCambios}>Guardar</Button>
                    <Button size="sm" color="danger" onClick={cerrarModal}>Cerrar</Button>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default Categoria;
