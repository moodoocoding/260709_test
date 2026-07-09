// ============================================================
// grading.js — 채점 입력 핵심 모듈 (키보드 기반 빠른 입력)
// ============================================================

(function () {
  'use strict';

  var Grading = {};
  window.Grading = Grading;

  // ── 상태 ──
  Grading.currentClass = null;
  Grading.currentSubject = null;
  Grading.currentStudent = 1;
  Grading.currentQuestion = 0; // 0-indexed
  Grading.isActive = false;
  Grading.isPausedForNextStudent = false; // 학생 시작/종료 대기 오버레이 작동 상태
  Grading._feedbackTimeout = null; // 피드백 딜레이 타이머

  // ── 학생 시작 안내 오버레이 표시 ──
  Grading.showStudentStartOverlay = function (studentNum) {
    var overlay = document.getElementById('grading-overlay');
    if (!overlay) return;
    
    Grading.isPausedForNextStudent = true;
    
    var html = '';
    html += '<div class="overlay-title">✏️ 채점 시작</div>';
    html += '<div class="overlay-subtitle">' + Grading.currentClass + '반 ' + studentNum + '번 학생 채점을 시작합니다.</div>';
    html += '<div class="overlay-desc">준비가 되면 아래 시작 버튼을 누르거나 [엔터키]를 누르세요.</div>';
    html += '<button id="overlay-action-btn" class="btn btn-primary overlay-btn">채점 시작 (Enter)</button>';
    
    overlay.innerHTML = html;
    overlay.style.display = 'flex';
    
    document.getElementById('overlay-action-btn').addEventListener('click', function() {
      Grading.dismissOverlayAndContinue();
    });
  };

  // ── 학생 채점 완료 및 점수 안내 오버레이 표시 ──
  Grading.showStudentCompleteOverlay = function (studentNum, score, correctCount, totalCount, isLast) {
    var overlay = document.getElementById('grading-overlay');
    if (!overlay) return;
    
    Grading.isPausedForNextStudent = true;
    
    var html = '';
    html += '<div class="overlay-title">🎉 채점 완료</div>';
    html += '<div class="overlay-subtitle">' + studentNum + '번 학생 채점이 완료되었습니다.</div>';
    html += '<div class="overlay-score">' + score + '점</div>';
    html += '<div class="overlay-desc">총 ' + totalCount + '문항 중 ' + correctCount + '문항 정답</div>';
    
    if (isLast) {
      html += '<button id="overlay-action-btn" class="btn btn-primary overlay-btn">전체 채점 완료 (Enter)</button>';
    } else {
      var nextStudent = studentNum + 1;
      html += '<button id="overlay-action-btn" class="btn btn-primary overlay-btn">다음 학생 (' + nextStudent + '번) 시작 (Enter)</button>';
    }
    
    overlay.innerHTML = html;
    overlay.style.display = 'flex';
    
    document.getElementById('overlay-action-btn').addEventListener('click', function() {
      if (isLast) {
        Grading.dismissOverlayAndFinish();
      } else {
        Grading.dismissOverlayAndNext(studentNum);
      }
    });
  };

  // ── 오버레이 닫고 계속 채점하기 ──
  Grading.dismissOverlayAndContinue = function () {
    var overlay = document.getElementById('grading-overlay');
    if (overlay) overlay.style.display = 'none';
    Grading.isPausedForNextStudent = false;
    Grading.renderCurrentQuestion();
  };

  // ── 오버레이 닫고 다음 학생으로 넘어가기 ──
  Grading.dismissOverlayAndNext = function (completedStudentNum) {
    var overlay = document.getElementById('grading-overlay');
    if (overlay) overlay.style.display = 'none';
    
    Grading.currentStudent = completedStudentNum + 1;
    Grading.currentQuestion = 0;
    Grading.isPausedForNextStudent = false;
    
    // 다음 학생의 채점 화면으로 직행! (시작 안내 모달 생략)
    Grading.renderCurrentQuestion();
  };

  // ── 오버레이 닫고 채점 완료하기 ──
  Grading.dismissOverlayAndFinish = function () {
    var overlay = document.getElementById('grading-overlay');
    if (overlay) overlay.style.display = 'none';
    Grading.isPausedForNextStudent = false;
    Grading.complete();
  };

  // ── 초기화 ──
  Grading.init = function () {
    var startBtn = document.getElementById('grading-start-btn');
    var prevBtn = document.getElementById('grading-prev-btn');
    var skipBtn = document.getElementById('grading-skip-btn');

    if (startBtn) {
      startBtn.addEventListener('click', function () {
        Grading.start();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        Grading.prevQuestion();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', function () {
        Grading.nextQuestion();
      });
    }

    // 전역 키보드 이벤트
    document.addEventListener('keydown', function (e) {
      Grading.handleKeyPress(e);
    });
  };

  Grading.onTabActive = function () {
    // 탭 활성화 시 셀렉트 박스 옵션 갱신
    Grading._updateSelectors();
  };

  // ── 셀렉트 박스 옵션 갱신 ──
  Grading._updateSelectors = function () {
    var classSelect = document.getElementById('grading-class-select');
    var subjectSelect = document.getElementById('grading-subject-select');

    if (classSelect) {
      // 시험설정에서 세팅한 반 하나만 옵션으로 넣고 자동 선택 및 비활성화 처리
      classSelect.innerHTML = '';
      var opt = document.createElement('option');
      opt.value = App.state.classNum;
      opt.textContent = App.state.classNum + '반';
      classSelect.appendChild(opt);
      
      classSelect.value = App.state.classNum;
      classSelect.disabled = true; // 담임 전용이므로 수정 불가하게 잠금
    }

    if (subjectSelect && subjectSelect.options.length <= 1) {
      subjectSelect.innerHTML = '<option value="">과목을 선택하세요</option>';
      App.SUBJECTS.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        subjectSelect.appendChild(opt);
      });
    }
  };

  // ── 채점 시작 ──
  Grading.start = function () {
    var classSelect = document.getElementById('grading-class-select');
    var subjectSelect = document.getElementById('grading-subject-select');

    if (!classSelect || !subjectSelect) return;

    var classNum = parseInt(classSelect.value);
    var subject = subjectSelect.value;

    if (!classNum || !subject) {
      App.showToast('반과 과목을 선택해주세요.', 'error');
      return;
    }

    // 정답 키 확인
    if (!App.state.answerKey || !App.state.answerKey[subject] || App.state.answerKey[subject].length === 0) {
      App.showToast('정답이 등록되지 않았습니다. 먼저 정답 엑셀을 업로드하세요.', 'error');
      return;
    }

    Grading.currentClass = classNum;
    Grading.currentSubject = subject;
    Grading.currentStudent = 1;
    Grading.currentQuestion = 0;
    Grading.isActive = true;

    // 기존 답안 데이터 초기화 (없으면)
    var key = classNum + '_' + subject;
    if (!App.state.answers[key]) {
      App.state.answers[key] = {};
    }

    // 각 학생별 배열 초기화 (없으면)
    var studentCount = App.state.studentCounts[classNum] || 25;
    for (var s = 1; s <= studentCount; s++) {
      if (!App.state.answers[key][s]) {
        App.state.answers[key][s] = new Array(App.QUESTIONS_PER_SUBJECT).fill(null);
      }
    }

    // 이미 입력된 학생이 있으면, 아직 입력 안 된 첫 학생부터 시작
    var startStudent = 1;
    for (var si = 1; si <= studentCount; si++) {
      var answers = App.state.answers[key][si];
      var allAnswered = answers.every(function (a) { return a !== null; });
      if (!allAnswered) {
        startStudent = si;
        // 해당 학생의 첫 미입력 문항 찾기
        var startQ = 0;
        for (var qi = 0; qi < answers.length; qi++) {
          if (answers[qi] === null) {
            startQ = qi;
            break;
          }
        }
        Grading.currentStudent = startStudent;
        Grading.currentQuestion = startQ;
        break;
      }
      // 마지막 학생까지 모두 완료되었으면 처음부터
      if (si === studentCount) {
        Grading.currentStudent = 1;
        Grading.currentQuestion = 0;
      }
    }

    // UI 전환
    var selector = document.getElementById('grading-selector');
    var workspace = document.getElementById('grading-workspace');
    if (selector) selector.style.display = 'none';
    if (workspace) workspace.style.display = 'block';

    // 첫 학생 시작 안내 오버레이 표시
    Grading.showStudentStartOverlay(Grading.currentStudent);
  };

  // ── 현재 문항 렌더링 ──
  Grading.renderCurrentQuestion = function () {
    if (!Grading.isActive) return;

    var key = Grading.currentClass + '_' + Grading.currentSubject;
    var studentCount = App.state.studentCounts[Grading.currentClass] || 25;
    var questions = App.state.answerKey[Grading.currentSubject];
    var question = questions[Grading.currentQuestion];

    if (!question) return;

    // ── 채점 정보 표시 ──
    var infoEl = document.getElementById('grading-info');
    if (infoEl) {
      infoEl.innerHTML =
        '<span class="grading-info-item"><span class="info-label">반</span> ' + Grading.currentClass + '반</span>' +
        '<span class="grading-info-item"><span class="info-label">과목</span> ' + Grading.currentSubject + '</span>' +
        '<span class="grading-info-item"><span class="info-label">학생</span> ' + Grading.currentStudent + '번</span>' +
        '<span class="grading-info-item"><span class="info-label">문항</span> ' + (Grading.currentQuestion + 1) + ' / ' + App.QUESTIONS_PER_SUBJECT + '</span>';
    }

    // ── 진행률 바 ──
    var progressBar = document.getElementById('grading-progress');
    var progressText = document.getElementById('grading-progress-text');
    if (progressBar || progressText) {
      // 완료된 학생 수 계산
      var completedStudents = 0;
      for (var s = 1; s <= studentCount; s++) {
        if (App.state.answers[key] && App.state.answers[key][s]) {
          var allDone = App.state.answers[key][s].every(function (a) { return a !== null; });
          if (allDone) completedStudents++;
        }
      }
      var progressPct = Math.round((completedStudents / studentCount) * 100);

      if (progressBar) {
        progressBar.style.width = progressPct + '%';
      }
      if (progressText) {
        progressText.textContent = completedStudents + '/' + studentCount + '명 완료 (' + progressPct + '%)';
      }
    }

    // ── 문항 카드 ──
    var cardEl = document.getElementById('current-question-card');
    if (cardEl) {
      var cardHtml = '';

      // 문항 번호 + 유형 뱃지
      var typeLabel = '';
      var typeBadgeClass = '';
      switch (question.type) {
        case 'objective_single':
          typeLabel = '객관식';
          typeBadgeClass = 'question-type-badge objective';
          break;
        case 'objective_multiple':
          typeLabel = '복수정답';
          typeBadgeClass = 'question-type-badge objective-multi';
          break;
        case 'subjective':
          typeLabel = '서술형';
          typeBadgeClass = 'question-type-badge subjective';
          break;
      }

      cardHtml += '<div class="question-header">';
      cardHtml += '<span class="question-number">' + question.number + '번</span>';
      cardHtml += '<span class="' + typeBadgeClass + '">' + typeLabel + '</span>';
      cardHtml += '</div>';

      // 정답 표시 (주관식/복수정답만)
      if (question.type === 'subjective' || question.type === 'objective_multiple') {
        var answerDisplay = question.answer.replace(/\n/g, '<br>');
        cardHtml += '<div class="question-answer-display">';
        cardHtml += '<div class="answer-label">정답</div>';
        cardHtml += '<div class="answer-text">' + answerDisplay + '</div>';
        if (question.type === 'objective_multiple') {
          cardHtml += '<div class="answer-hint">정답을 확인하고 O/X를 눌러주세요</div>';
        }
        if (question.type === 'subjective') {
          cardHtml += '<div class="answer-hint">학생 답안과 비교하여 O/X를 눌러주세요</div>';
        }
        cardHtml += '</div>';
      }

      cardEl.innerHTML = cardHtml;
    }

    // ── 입력 영역 ──
    var inputArea = document.getElementById('grading-input-area');
    if (inputArea) {
      var inputHtml = '';
      var currentAnswer = null;
      if (App.state.answers[key] && App.state.answers[key][Grading.currentStudent]) {
        currentAnswer = App.state.answers[key][Grading.currentStudent][Grading.currentQuestion];
      }

      if (question.type === 'objective_single') {
        // 5개 보기 버튼
        inputHtml += '<div class="answer-buttons">';
        for (var i = 1; i <= 5; i++) {
          var selected = currentAnswer === i ? ' selected' : '';
          var isCorrect = '';
          if (currentAnswer === i) {
            // 정답 확인
            var correctNum = App.CIRCLE_TO_NUM[question.answer];
            isCorrect = (i === correctNum) ? ' correct' : ' incorrect';
          }
          inputHtml += '<button class="answer-btn' + selected + isCorrect + '" data-value="' + i + '">' + App.NUM_TO_CIRCLE[i] + '</button>';
        }
        inputHtml += '</div>';
        inputHtml += '<div class="keyboard-hint">⌨️ 키보드 <kbd>1</kbd>~<kbd>5</kbd>로 입력</div>';

      } else {
        // O/X 버튼 (주관식 + 복수정답)
        inputHtml += '<div class="ox-buttons">';
        var oSelected = currentAnswer === true ? ' selected correct' : '';
        var xSelected = currentAnswer === false ? ' selected incorrect' : '';
        inputHtml += '<button class="ox-btn ox-o' + oSelected + '" data-value="true">O</button>';
        inputHtml += '<button class="ox-btn ox-x' + xSelected + '" data-value="false">X</button>';
        inputHtml += '</div>';
        inputHtml += '<div class="keyboard-hint">⌨️ 키보드 <kbd>O</kbd> 또는 <kbd>X</kbd>로 입력</div>';
      }

      inputArea.innerHTML = inputHtml;

      // 버튼 클릭 이벤트
      inputArea.querySelectorAll('.answer-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = parseInt(this.getAttribute('data-value'));
          Grading.recordAnswer(val);
        });
      });

      inputArea.querySelectorAll('.ox-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = this.getAttribute('data-value') === 'true';
          Grading.recordAnswer(val);
        });
      });
    }
  };

  // ── 키보드 핸들러 ──
  Grading.handleKeyPress = function (e) {
    if (!Grading.isActive) return;

    // 다른 입력 요소에 포커스 되어 있으면 무시
    var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    // 학생 시작/완료 대기 중일 때 엔터 또는 스페이스바 처리
    if (Grading.isPausedForNextStudent) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var actionBtn = document.getElementById('overlay-action-btn');
        if (actionBtn) actionBtn.click();
      }
      return;
    }

    var questions = App.state.answerKey[Grading.currentSubject];
    var question = questions[Grading.currentQuestion];
    if (!question) return;

    var keyCode = e.key;

    if (question.type === 'objective_single') {
      // 숫자 1~5
      if (['1', '2', '3', '4', '5'].includes(keyCode)) {
        e.preventDefault();
        Grading.recordAnswer(parseInt(keyCode));
        return;
      }
    } else {
      // O/X
      if (keyCode === 'o' || keyCode === 'O') {
        e.preventDefault();
        Grading.recordAnswer(true);
        return;
      }
      if (keyCode === 'x' || keyCode === 'X') {
        e.preventDefault();
        Grading.recordAnswer(false);
        return;
      }
    }

    // 네비게이션
    if (keyCode === 'ArrowLeft') {
      e.preventDefault();
      Grading.prevQuestion();
    } else if (keyCode === 'ArrowRight') {
      e.preventDefault();
      Grading.nextQuestion();
    } else if (keyCode === 'Escape') {
      e.preventDefault();
      Grading.stop();
    }
  };

  // ── 답안 기록 ──
  Grading.recordAnswer = function (value) {
    if (!Grading.isActive) return;

    // 피드백 딜레이 중이면 무시 (연타 방지)
    if (Grading._feedbackTimeout) return;

    var key = Grading.currentClass + '_' + Grading.currentSubject;
    if (!App.state.answers[key]) App.state.answers[key] = {};
    if (!App.state.answers[key][Grading.currentStudent]) {
      App.state.answers[key][Grading.currentStudent] = new Array(App.QUESTIONS_PER_SUBJECT).fill(null);
    }

    // 답안 저장
    App.state.answers[key][Grading.currentStudent][Grading.currentQuestion] = value;
    App.saveState();

    // 시각적 피드백
    var question = App.state.answerKey[Grading.currentSubject][Grading.currentQuestion];
    var isCorrect = false;

    if (question.type === 'objective_single') {
      var correctNum = App.CIRCLE_TO_NUM[question.answer];
      isCorrect = (value === correctNum);
    } else {
      // 주관식/복수정답: O(true)이면 정답
      isCorrect = (value === true);
    }

    // UI 피드백
    Grading._showFeedback(value, isCorrect, question.type);

    // 0.3초 후 다음 문항으로 이동
    Grading._feedbackTimeout = setTimeout(function () {
      Grading._feedbackTimeout = null;
      Grading.nextQuestion();
    }, 300);
  };

  // ── 시각적 피드백 ──
  Grading._showFeedback = function (value, isCorrect, type) {
    var inputArea = document.getElementById('grading-input-area');
    if (!inputArea) return;

    if (type === 'objective_single') {
      var btns = inputArea.querySelectorAll('.answer-btn');
      btns.forEach(function (btn) {
        btn.classList.remove('selected', 'correct', 'wrong');
        var btnVal = parseInt(btn.getAttribute('data-value'));
        if (btnVal === value) {
          btn.classList.add('selected');
          btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
      });
    } else {
      var oxBtns = inputArea.querySelectorAll('.ox-btn');
      oxBtns.forEach(function (btn) {
        btn.classList.remove('selected', 'correct', 'wrong');
        var btnVal = btn.getAttribute('data-value') === 'true';
        if (btnVal === value) {
          btn.classList.add('selected');
          btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
      });
    }

    // 카드 전체 피드백 효과
    var card = document.getElementById('current-question-card');
    if (card) {
      card.classList.remove('feedback-correct', 'feedback-incorrect');
      card.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');
    }
  };

  // ── 다음 문항 이동 ──
  Grading.nextQuestion = function () {
    if (!Grading.isActive) return;

    var studentCount = App.state.studentCounts[Grading.currentClass] || 25;

    if (Grading.currentQuestion < App.QUESTIONS_PER_SUBJECT - 1) {
      // 같은 학생 다음 문항
      Grading.currentQuestion++;
      Grading.renderCurrentQuestion();
    } else {
      // 현재 학생의 채점이 완전히 끝남 -> 성적 계산 및 오버레이 알림
      var classNum = Grading.currentClass;
      var subject = Grading.currentSubject;
      var studentNum = Grading.currentStudent;
      var key = classNum + '_' + subject;

      var correctCount = 0;
      var totalCount = App.QUESTIONS_PER_SUBJECT;
      var studentAnswers = (App.state.answers[key] && App.state.answers[key][studentNum]) || [];
      var answerKey = App.state.answerKey[subject] || [];

      for (var q = 0; q < totalCount; q++) {
        var ans = studentAnswers[q];
        var correct = answerKey[q];
        if (correct && ans !== null && ans !== undefined) {
          if (correct.type === 'objective_single') {
            var correctNum = App.CIRCLE_TO_NUM[correct.answer];
            if (ans === correctNum) correctCount++;
          } else {
            if (ans === true) correctCount++;
          }
        }
      }
      var score = correctCount * App.POINTS_PER_QUESTION;
      var isLast = (studentNum >= studentCount);

      // 완료 및 점수 안내 오버레이 노출
      Grading.showStudentCompleteOverlay(studentNum, score, correctCount, totalCount, isLast);
    }
  };

  // ── 이전 문항 이동 ──
  Grading.prevQuestion = function () {
    if (!Grading.isActive) return;

    if (Grading.currentQuestion > 0) {
      Grading.currentQuestion--;
    } else if (Grading.currentStudent > 1) {
      Grading.currentStudent--;
      Grading.currentQuestion = App.QUESTIONS_PER_SUBJECT - 1;
    }
    // 첫 학생 첫 문항이면 이동 안 함

    Grading.renderCurrentQuestion();
  };

  // ── 채점 중단 ──
  Grading.stop = function () {
    Grading.isActive = false;

    if (Grading._feedbackTimeout) {
      clearTimeout(Grading._feedbackTimeout);
      Grading._feedbackTimeout = null;
    }

    var selector = document.getElementById('grading-selector');
    var workspace = document.getElementById('grading-workspace');
    if (selector) selector.style.display = '';
    if (workspace) workspace.style.display = 'none';
  };

  // ── 채점 완료 ──
  Grading.complete = function () {
    App.showToast(Grading.currentClass + '반 ' + Grading.currentSubject + ' 채점 완료! 🎉', 'success');
    Grading.stop();
    if (window.Dashboard) Dashboard.render();
  };
})();
