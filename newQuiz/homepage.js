import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6H2NaGIybnyu2tH0nT7royeibAebJAIY",
  authDomain: "model-191ff.firebaseapp.com",
  projectId: "model-191ff",
  storageBucket: "model-191ff.appspot.com", // 🔄 Fix URL
  messagingSenderId: "715464346435",
  appId: "1:715464346435:web:9e7a2105772e38a903bdf6",
  measurementId: "G-Y1X9FJZ082",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    console.log("User signed in:", currentUserId);
  } else {
    console.warn("No user signed in");
  }
});

let annotations = [];
let score = 0;
const questions = [];
let currentQuestionIndex = 0;
let answerChecked = false;



window.addEventListener("DOMContentLoaded", function () {
   const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get('uid');  // Get the 'uid' parameter from the URL

  const iframe = document.getElementById("api-frame");

  const client = new Sketchfab("1.12.1", iframe);

  client.init(uid, {
    success: function (api) {
      api.start();

      api.addEventListener("viewerready", function () {
        api.getAnnotationList(function (err, annots) {
          if (!err) {
            annotations = annots;
            emptyAnnotations(api);
            makeQuestions();
            shuffleQuestions(questions);
            displayQuestion();
            document.getElementById("quiz-container").style.display = "block";
          }
        });
      });
    },
    error: function () {
      console.error("Sketchfab API error");
    },
    autostart: 1,
    preload: 1,
  });
});

function emptyAnnotations(api) {
  annotations.forEach((_, i) => {
    api.updateAnnotation(i, { title: "---", content: undefined });
  });
}

function makeQuestions() {
  annotations.forEach((annot, i) => {
    const correctIndex = (i + 1).toString();
    const options = new Set([correctIndex]);
    while (options.size < 5) {
      const rand = Math.floor(Math.random() * annotations.length) + 1;
      options.add(rand.toString());
    }

    questions.push({
      question: `Where is ${annot.name}?`,
      correctAnswerIndex: correctIndex,
      options: Array.from(options).sort(() => Math.random() - 0.5),
    });
  });
}

function shuffleQuestions(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function displayQuestion() {
  answerChecked = false;
  const currentQuestion = questions[currentQuestionIndex];
  const questionElement = document.getElementById("question");
  const optionsElement = document.getElementById("options");
  const result = document.getElementById("result");
  const nextBtn = document.getElementById("next-button");

  result.textContent = "";
  nextBtn.disabled = true;
  nextBtn.textContent = "Check Answer";

  questionElement.textContent = currentQuestion.question;
  optionsElement.innerHTML = currentQuestion.options
    .map(
      (option) => `
    <label>
      <input type="radio" name="answer" value="${option}"> Annotation ${option}
    </label><br/>`
    )
    .join("");

  document.querySelectorAll('input[name="answer"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      nextBtn.disabled = false;
    });
  });
}

document.getElementById("next-button").addEventListener("click", () => {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) return;

  const result = document.getElementById("result");
  const nextBtn = document.getElementById("next-button");
  const currentQ = questions[currentQuestionIndex];

  if (!answerChecked) {
    // First click: check answer
    const isCorrect = selected.value === currentQ.correctAnswerIndex;
    result.textContent = isCorrect
      ? "✅ Correct!"
      : `❌ Wrong. Correct answer is Annotation ${currentQ.correctAnswerIndex}`;
    if (isCorrect) score++;

    answerChecked = true;
    nextBtn.textContent =
      currentQuestionIndex === questions.length - 1
        ? "Show Score"
        : "Next Question";
  } else {
    // Second click: move to next
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      displayQuestion();
    } else {
      showScore();
      submitScore();
    }
  }
});

function showScore() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Quiz Completed!</h2>
    <p>Your score: ${score}/${questions.length}</p>
    <button onclick="location.reload()">Take Quiz Again</button>
    
  `;
}
async function submitScore() {
  const url =
    "https://script.google.com/macros/s/AKfycbxV2hvcLn1XYktI1IRrtywLPhjOflVJbXehnCUrlwdtlmvo9cPGPO6HFI47elVRV0uh/exec"; // 🔁 Replace this with your actual Apps Script URL

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid: currentUserId || "anonymous",
        score: score,
      }),
    });

    const result = await response.text();
    alert(`Score submitted: ${score}/${questions.length}\nResponse: ${result}`);
  } catch (error) {
    console.error("Error submitting score to Google Sheets:", error);
  }
}

