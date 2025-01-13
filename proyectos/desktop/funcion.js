window.addEventListener('DOMContentLoaded', function() {
    // Esperar 1 segundo antes de mover la intro
    setTimeout(function() {
        // Desplazar la intro hacia arriba
        document.getElementById('intro').classList.add('hidden');

        // Después de la transición, mostrar el contenido principal
        setTimeout(function() {
            document.getElementById('intro').style.display = 'none';
            document.getElementById('principal').style.display = 'block';
        }, 1000); // 1 segundo para coincidir con el tiempo de la transición
    }, 1000);
});

function escribirTexto(texto, elemento, velocidad) {
    let index = 0;
    elemento.value = "";  // Inicializa el campo vacío

    function escribir() {
        if (index < texto.length) {
            elemento.value += texto.charAt(index); // Añade la siguiente letra
            index++;
            setTimeout(escribir, velocidad); // Llama recursivamente para añadir la siguiente letra
        }
    }

    escribir(); // Inicia el proceso de escribir el texto
}

// Abrir Llaves
document.getElementById('opAbrirLlave').addEventListener('click', function() {
    let expresion = document.getElementById('textExpresion').value +"(";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 1;

    escribirTexto(expresion, textArea, velocidad);
});

// Cerrar Llaves
document.getElementById('opCerrarLlave').addEventListener('click', function() {
    let expresion = document.getElementById('textExpresion').value +")";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 1;

    escribirTexto(expresion, textArea, velocidad);
});

// Operador O
document.getElementById('opO').addEventListener('click', function() {
    let expresion = document.getElementById('textExpresion').value +" v ";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 1;

    escribirTexto(expresion, textArea, velocidad);
});

// Operador Y
document.getElementById('opY').addEventListener('click', function() {
    let expresion = document.getElementById('textExpresion').value +" ^ ";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 1;

    escribirTexto(expresion, textArea, velocidad);
});

// Operador Negacion
document.getElementById('opN').addEventListener('click', function() {
    let expresion = document.getElementById('textExpresion').value +"~";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 1;

    escribirTexto(expresion, textArea, velocidad);
});

// Actualizar expresion con operadores
document.getElementById('ley1').addEventListener('click', function() {
    let expresion = "A v A";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 100;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley2').addEventListener('click', function() {
    let expresion = "~~A";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 100;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley3').addEventListener('click', function() {
    let expresion = "A v ~A";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 100;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley4').addEventListener('click', function() {
    let expresion = "A v (A ^ B)";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 50;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley5').addEventListener('click', function() {
    let expresion = "(A ^ B) v (A ^ C)";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 50;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley6').addEventListener('click', function() {
    let expresion = "A v 0";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 100;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley7').addEventListener('click', function() {
    let expresion = "A v 1";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 50;

    escribirTexto(expresion, textArea, velocidad);
});

document.getElementById('ley8').addEventListener('click', function() {
    let expresion = "~(A v B)";
    let textArea = document.getElementById('textExpresion');
    let velocidad = 50;

    escribirTexto(expresion, textArea, velocidad);
});


//--------------------- Operar la expresion -----------------------
document.getElementById('operarExpresion').addEventListener('click', function() {
    // Cambiar el texto del botón y mostrar el spinner
    let boton = document.getElementById('operarExpresion');
    let spinner = boton.querySelector('.spinner-border');
    let textoBoton = document.getElementById('btnText');

    // Mostrar el spinner y cambiar el texto a "Operando..."
    spinner.style.display = "inline-block";
    textoBoton.textContent = "Operando...";

    // Evaluar la expresións
    evaluarExpresion(function(tiempoDuracion) {
        // Después de la duración del tiempo (calculado por la longitud del texto y la velocidad)
        setTimeout(function() {
            // Ocultar el spinner y volver el texto del botón a "Realizar Operación..."
            spinner.style.display = "none";
            textoBoton.textContent = "Realizar Operación";
        }, tiempoDuracion);
    });
});


//-------------Funciones para operar---------------------
function simplificarExpresion(expresion, solucionPasoAPaso) {
    let antes;

    // Ley de involucion: ~~A = A
    antes = expresion;
    expresion = expresion.replace(/~~/g, '');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley de involución: \n${antes} => ${expresion}\n\n`;
    }

    // Ley de complemento: A v ~A = 1, A ^ ~A = 0
    antes = expresion;
    expresion = expresion.replace(/(\w) v ~\1/g, '1');
    expresion = expresion.replace(/(\w) \^ ~\1/g, '0');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley de complemento: \n${antes} => ${expresion}\n\n`;
    }

    // Neutros diferentes: A v 0 = A, A ^ 1 = A
    antes = expresion;
    expresion = expresion.replace(/(\w) v 0/g, '$1');
    expresion = expresion.replace(/(\w) \^ 1/g, '$1');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando neutros diferentes: \n${antes} => ${expresion}\n\n`;
    }

    // Ley de distribucion: (A ^ B) v (A ^ C) = A ^ (B v C)
    antes = expresion;
    let resultado = leyDistributiva(expresion, solucionPasoAPaso);
    expresion = resultado.exp;
    solucionPasoAPaso = resultado.solucionPasoAPaso;
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley distributiva: \n${antes} => ${expresion}\n\n`;
    }

    // Ley de absorcion: A v (A ^ B) = A, A ^ (A v B) = A
    antes = expresion;
    expresion = expresion.replace(/(\w) v \(\1 \^ \w+\)/g, '$1');
    expresion = expresion.replace(/(\w) \^ \(\1 v \w+\)/g, '$1');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley de absorción: \n${antes} => ${expresion}\n\n`;
    }

    // Ley de idempotencia: A v A = A, A ^ A = A
    antes = expresion;
    expresion = expresion.replace(/(\w) v \1/g, '$1');
    expresion = expresion.replace(/(\w) \^ \1/g, '$1');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley de idempotencia: \n${antes} => ${expresion}\n\n`;
    }

    // Elementos Nulos: A v 1 = 1, A ^ 0 = 0
    antes = expresion;
    expresion = expresion.replace(/(\w) v 1/g, '1');
    expresion = expresion.replace(/(\w) \^ 0/g, '0');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando elementos nulos: \n${antes} => ${expresion}\n\n`;
    }

    // Ley De Morgan: ~(A v B) = ~A ^ ~B, ~(A ^ B) = ~A v ~B
    antes = expresion;
    expresion = expresion.replace(/~\((\w) v (\w)\)/g, '~$1 ^ ~$2');
    expresion = expresion.replace(/~\((\w) \^ (\w)\)/g, '~$1 v ~$2');
    if (expresion !== antes) {
        solucionPasoAPaso += `Aplicando ley de De Morgan: \n${antes} => ${expresion}\n\n`;
    }

    return { expresion, solucionPasoAPaso };
}

// Ley distributiva mejorada para procesar paso a paso
function leyDistributiva(expresion, solucionPasoAPaso) {
    let regexDistributiva1 = /\((\w) \^ (\w)\) v \(\1 \^ (\w)\)/g;
    let regexDistributiva2 = /\((\w) v (\w)\) \^ \(\1 v (\w)\)/g;

    expresion = expresion.replace(regexDistributiva1, '($1 ^ ($2 v $3))');
    expresion = expresion.replace(regexDistributiva2, '($1 v ($2 ^ $3))');

    return { exp: expresion, solucionPasoAPaso };
}

// Funcion para aplicar la propiedad asociativa y combinar términos
function aplicarConmutativa(expresion) {
    let antes = expresion;
    
    // Expresión regular para encontrar términos del tipo ((A v B) v C) o (A v (B v C)) o ((A ^ B) ^ C) o (A ^ (B ^ C))
    let regexORInternos = /\(([^()]+) v ([^()]+)\)/g;
    let regexANDInternos = /\(([^()]+) \^ ([^()]+)\)/g;
    
    // Mientras la expresión tenga grupos OR anidados, elimina paréntesis usando la propiedad asociativa
    while (regexORInternos.test(expresion) || regexANDInternos.test(expresion)) {
        expresion = expresion.replace(regexORInternos, '$1 v $2 v $3');
        expresion = expresion.replace(regexANDInternos, '$1 ^ $2 ^ $3');
    }

    if (expresion !== antes) {
        console.log(`Aplicando propiedad Conmutativa: ${antes} => ${expresion}`);
    }

    return expresion;
}


// Función para evaluar y simplificar los paréntesis en la expresión
function evaluarParentesis(expresion, solucionPasoAPaso) {
    // Primero eliminar paréntesis externos si envuelven toda la expresión
    if (expresion.startsWith('(') && expresion.endsWith(')')) {
        let contenidoInterno = expresion.slice(1, -1);
        expresion = contenidoInterno;
        
    }

    return { expresion, solucionPasoAPaso };
}

// Evaluación de la expresión booleana con callback
function evaluarExpresion(callback) {
    try {
        let expresion = "("+document.getElementById('textExpresion').value+")";
        let solucionPasoAPaso = `Expresión inicial: ${expresion}\n\n`;

        // Evaluar y simplificar la expresión
        let resultadoFinal = evaluarParentesis(expresion, solucionPasoAPaso);

        // Simplificar con las leyes de Boole
        let simplificacion = simplificarExpresion(resultadoFinal.expresion, resultadoFinal.solucionPasoAPaso);

        solucionPasoAPaso = simplificacion.solucionPasoAPaso;
        solucionPasoAPaso += `Resultado final: ${simplificacion.expresion}`;

        // Mostrar el proceso paso a paso en el textarea
        let textArea = document.getElementById('textRespuesta');
        let velocidad = 10;
        let tiempoDuracion = solucionPasoAPaso.length * velocidad;

        // Escribir el texto letra por letra
        escribirTexto(solucionPasoAPaso, textArea, velocidad);
        callback(tiempoDuracion);

    } catch (error) {
        document.getElementById('textRespuesta').value = `Error en la expresión: ${error.message}`;
        callback(0);  // Llamar al callback inmediatamente en caso de error
    }
}


