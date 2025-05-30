import tensorflow as tf
from tensorflow import keras
import numpy as np
import matplotlib.pyplot as plt
import cv2
import numpy as np
from tensorflow.keras import layers
from tensorflow.keras.utils import image_dataset_from_directory
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

train_dataset = image_dataset_from_directory(
    "C:/Users/Usuario/Desktop/cursos/ciclo 9/Inteligencia Artificial/Proyecto/imagenes_unicos",          # Ruta al dataset
    validation_split=0.2,         # 20% para validación
    subset="training",
    seed=123,
    image_size=(128, 128),        # Puedes ajustar tamaño según tus imágenes
    batch_size=32
)

val_dataset = image_dataset_from_directory(
    "C:/Users/Usuario/Desktop/cursos/ciclo 9/Inteligencia Artificial/Proyecto/imagenes_unicos",
    validation_split=0.2,
    subset="validation",
    seed=123,
    image_size=(128, 128),
    batch_size=32
)

class_names = train_dataset.class_names
print(class_names)


normalization_layer = layers.Rescaling(1./255)

train_dataset = train_dataset.map(lambda x, y: (normalization_layer(x), y))
val_dataset = val_dataset.map(lambda x, y: (normalization_layer(x), y))

model = keras.Sequential([
    layers.Input(shape=(128, 128, 3)),
    layers.Conv2D(32, 3, activation='relu'),
    layers.MaxPooling2D(),
    layers.Conv2D(64, 3, activation='relu'),
    layers.MaxPooling2D(),
    layers.Flatten(),
    layers.Dense(64, activation='relu'),
    layers.Dense(len(class_names), activation='softmax')  # salida con tantas clases como herramientas
])

model.compile(optimizer='adam',
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])

model.summary()

model.fit(train_dataset, validation_data=val_dataset, epochs=20)

model.save("modelo_herramientas.h5")


model = load_model("modelo_herramientas.h5")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    img = cv2.resize(frame, (128, 128))
    img = img_to_array(img)
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    prediction = model.predict(img)
    class_id = np.argmax(prediction)
    label = class_names[class_id]

    cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
    cv2.imshow('Clasificador de herramientas', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
#clasificador general.