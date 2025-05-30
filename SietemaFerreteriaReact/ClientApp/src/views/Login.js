import { useContext, useState } from "react"
import { UserContext } from "../context/UserProvider"
import Swal from 'sweetalert2'
import { Navigate } from "react-router-dom"
// Componente funcional para el formulario de inicio de sesión
const Login = () => {
    // Estados locales para almacenar los valores de los campos de correo y clave (contraseña)
    const [_correo, set_Correo] = useState("")
    const [_clave, set_Clave] = useState("")

    // Extraemos el estado del usuario y la función iniciarSession del contexto UserContext
    const { user, iniciarSession } = useContext(UserContext)
        // Si el usuario ya está autenticado, redirige a la página principal "/"
    if (user != null) {
        return <Navigate to="/"/>
    }
    // Manejo del evento de envío del formulario
    const handleSubmit = (event) => {
        event.preventDefault();

        let request = {
            correo: _correo,
            clave:_clave
        }

        // Realizamos la solicitud a la API para iniciar sesión
        const api = fetch("api/session/Login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(request)
        })
        .then((response) => {
            return response.ok ? response.json() : Promise.reject(response);
        })
        .then((dataJson) => {
            if (dataJson.idUsuario == 0) {
                // Usamos la librería SweetAlert2 para mostrar un mensaje de error si no se encuentra el usuario
                Swal.fire(
                    'Opps!',
                    'No se encontro el usuario',
                    'error'
                )
            } else {
                // Si el usuario es válido, iniciamos la sesión llamando a iniciarSession
                iniciarSession(dataJson)
            }

            // Si ocurre algún error durante la solicitud, mostramos un mensaje de error

        }).catch((error) => {
            Swal.fire(
                'Opps!',
                'No se pudo iniciar sessión',
                'error'
            )
        })
    }

    return (
        <div className="container">

            <div className="row justify-content-center">

                <div className="col-xl-10 col-lg-12 col-md-9">

                    <div className="card o-hidden border-0 shadow-lg my-5">
                        <div className="card-body p-0">

                            <div className="row">
                                <div className="col-lg-6 d-none d-lg-block ">
                                    <img src="/imagen/login.jpg" alt="Descripción de la imagen" className="img-fluid" style={{ height: '360px', objectFit: 'cover' }} />
                                </div>
                                <div className="col-lg-6">
                                    <div className="p-5">
                                        <div className="text-center">
                                            <h1 className="h4 text-gray-900 mb-4">Bienvenido</h1>
                                        </div>
                                        <form className="user" onSubmit={handleSubmit}>
                                            <div className="form-group">
                                                <input type="email" className="form-control form-control-user" aria-describedby="emailHelp" placeholder="Correo"
                                                    value={_correo}
                                                    onChange={(e) => set_Correo(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <input type="password" className="form-control form-control-user" placeholder="Contraseña"
                                                    value={_clave}
                                                    onChange={(e) => set_Clave(e.target.value)}
                                                />
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-user btn-block"> Ingresar </button>
                                            
                                        </form>
                                        <hr></hr>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>

                </div>

            </div>

        </div>
        )
}

export default Login