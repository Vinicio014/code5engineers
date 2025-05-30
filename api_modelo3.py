from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import os

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": "*"}})

# Configura tu base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = (
    'mssql+pyodbc://@DESKTOP-SJKPN8M\\SQLEXPRESS/FERRETERIA_REACT'
    '?driver=ODBC+Driver+17+for+SQL+Server'
    '&trusted_connection=yes'
    '&TrustServerCertificate=yes'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Modelo corregido según tu estructura de BD
class Producto(db.Model):
    __tablename__ = 'Producto'  # Nombre exacto de la tabla
    
    idProducto = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(100))
    marca = db.Column(db.String(100))
    descripcion = db.Column(db.String(100))
    idCategoria = db.Column(db.Integer)
    stock = db.Column(db.Integer)
    precio = db.Column(db.Numeric(10, 2))  # decimal(10,2) en SQL Server
    esActivo = db.Column(db.Boolean)
    fechaRegistro = db.Column(db.DateTime)

# Cargar modelo de IA
model = load_model("modelo_herramientas.h5")
clases = ['brocha', 'cable_extension', 'clavo', 'cuchilla', 'destornillador', 'linterna_frontal', 'llave_inglesa', 'martillo', 'metro']

# Mapeo de clases de IA a términos de búsqueda en tu BD
mapeo_busqueda = {
    'brocha': ['brocha', 'pincel'],
    'cable_extension': ['cable', 'extension', 'alargador'],
    'clavo': ['clavo', 'puntilla'],
    'cuchilla': ['cuchilla', 'navaja', 'pelacables'],  # Como tienes "Pelacables" en tu BD
    'destornillador': ['destornillador', 'desarmador'],
    'linterna_frontal': ['linterna', 'frontal', 'foco'],
    'llave_inglesa': ['llave', 'inglesa', 'ajustable'],
    'martillo': ['martillo'],
    'metro': ['metro', 'cinta', 'medida']
}

@app.route("/predict", methods=["POST"])
def predict():
    try:
        img_file = request.files['image']
        img_path = "temp.jpg"
        img_file.save(img_path)

        # Convertir la imagen al tamaño y forma correctos
        img = image.load_img(img_path, target_size=(128, 128))
        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        prediction = model.predict(img_array)
        predicted_class = clases[np.argmax(prediction)]
        confidence = float(np.max(prediction))

        print(f"Clase predicha: {predicted_class}, Confianza: {confidence:.2f}")

        # Buscar producto en la base de datos
        producto = None
        
        # Buscar usando los términos mapeados
        if predicted_class in mapeo_busqueda:
            terminos = mapeo_busqueda[predicted_class]
            
            for termino in terminos:
                # Buscar en descripción, marca o código
                producto = Producto.query.filter(
                    db.and_(
                        Producto.esActivo == True,  # Solo productos activos
                        db.or_(
                            Producto.descripcion.ilike(f'%{termino}%'),
                            Producto.marca.ilike(f'%{termino}%'),
                            Producto.codigo.ilike(f'%{termino}%')
                        )
                    )
                ).first()
                
                if producto:
                    break  # Si encuentra uno, para la búsqueda

        # Limpiar archivo temporal
        if os.path.exists(img_path):
            os.remove(img_path)

        if producto and confidence > 0.4:  # Umbral de confianza
            return jsonify({
                "success": True,
                "producto": {
                    "idProducto": producto.idProducto,
                    "codigo": producto.codigo,
                    "marca": producto.marca,
                    "descripcion": producto.descripcion,
                    "precio": float(producto.precio),
                    "stock": producto.stock
                },
                "confidence": confidence,
                "clase_detectada": predicted_class
            })
        else:
            mensaje = f"Producto '{predicted_class}' no encontrado"
            if confidence <= 0.3:
                mensaje += f" (confianza baja: {confidence:.2f})"
                
            return jsonify({
                "success": False,
                "producto": None,
                "message": mensaje,
                "clase_detectada": predicted_class,
                "confidence": confidence
            })

    except Exception as e:
        print(f"Error en predict: {str(e)}")
        # Limpiar archivo temporal en caso de error
        if 'img_path' in locals() and os.path.exists(img_path):
            os.remove(img_path)
            
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Error interno del servidor"
        }), 500

# Endpoint adicional para probar la conexión a la BD
@app.route("/test-db", methods=["GET"])
def test_db():
    try:
        productos = Producto.query.filter(Producto.esActivo == True).limit(5).all()
        return jsonify({
            "success": True,
            "productos": [
                {
                    "idProducto": p.idProducto,
                    "codigo": p.codigo,
                    "marca": p.marca,
                    "descripcion": p.descripcion,
                    "precio": float(p.precio)
                } for p in productos
            ]
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)  