// Fungsi tokenisasi sederhana
function tokenize(text) {
  return text.toLowerCase().split(/\s+/);
}

// Fungsi untuk membuat kamus kata unik
function createVocabulary(texts) {
  const vocabulary = new Set();
  texts.forEach(text => {
    const tokens = tokenize(text);
    tokens.forEach(token => {
      vocabulary.add(token);
    });
  });
  return Array.from(vocabulary);
}

// Fungsi untuk mengubah teks menjadi vektor one-hot
function textToVector(text, vocabulary) {
  const tokens = tokenize(text);
  const vector = new Array(vocabulary.length).fill(0);
  tokens.forEach(token => {
    const index = vocabulary.indexOf(token);
    if (index !== -1) {
      vector[index] = 1;
    }
  });
  return vector;
}

// Data latih
const texts = ['Ini adalah contoh kalimat pertama.', 'Ini adalah contoh kalimat kedua.', 'Sistem NLP sangat menarik.'];

// Label
const labels = [1, 1, 0];  // Contoh label positif dan negatif

// Membuat kamus kata unik
const vocabulary = createVocabulary(texts);

// Mengubah teks menjadi vektor one-hot
const data = texts.map(text => textToVector(text, vocabulary));

// Inisialisasi bobot dan bias
const inputSize = vocabulary.length;
const outputSize = 1;
const learningRate = 0.01;

let weights = new Array(inputSize).fill(0.5);  // Inisialisasi bobot
let bias = 0.5;  // Inisialisasi bias

// Fungsi aktivasi sigmoid
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// Pelatihan model
const epochs = 10;
for (let epoch = 0; epoch < epochs; epoch++) {
  for (let i = 0; i < data.length; i++) {
    const input = data[i];
    const label = labels[i];

    // Feedforward
    const output = input.reduce((sum, value, index) => sum + value * weights[index], 0) + bias;
    const prediction = sigmoid(output);

    // Perhitungan gradien
    const error = label - prediction;
    const gradient = prediction * (1 - prediction) * error;

    // Update bobot
    for (let j = 0; j < inputSize; j++) {
      weights[j] += learningRate * gradient * input[j];
    }

    // Update bias
    bias += learningRate * gradient;
  }
}

// Uji model
const testText = 'Ini adalah contoh kalimat ketiga.';
const testVector = textToVector(testText, vocabulary);
const testOutput = testVector.reduce((sum, value, index) => sum + value * weights[index], 0) + bias;
const testPrediction = sigmoid(testOutput);

console.log(`Hasil prediksi untuk teks uji: ${testPrediction}`);
