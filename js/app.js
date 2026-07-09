// ============================================================
// app.js — 앱 핵심 모듈 (상태 관리, 유틸리티, 탭 전환, 대시보드)
// ============================================================

(function () {
  'use strict';

  // ── 전역 네임스페이스 ──
  const App = {};
  window.App = App;

  // ── 상수 ──
  App.SUBJECTS = ['국어', '수학', '영어'];
  App.CLASSES = [1, 2, 3, 4, 5, 6];
  App.QUESTIONS_PER_SUBJECT = 25;
  App.POINTS_PER_QUESTION = 4;
  App.STORAGE_KEY = 'examGraderState';

  // ── 숫자 ↔ 원문자 변환 ──
  App.CIRCLE_TO_NUM = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5 };
  App.NUM_TO_CIRCLE = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤' };

  // ── 문항 유형 판별 ──
  App.detectQuestionType = function (answer) {
    const circleNums = ['①', '②', '③', '④', '⑤'];
    const str = String(answer).trim();
    const found = circleNums.filter(function (c) { return str.includes(c); });
    if (found.length === 1 && str.length <= 2) return 'objective_single';
    if (found.length >= 2) return 'objective_multiple';
    return 'subjective';
  };

  // ── 점수 포맷팅 ──
  App.formatScore = function (correct, total) {
    var score = correct * App.POINTS_PER_QUESTION;
    var maxScore = total * App.POINTS_PER_QUESTION;
    return score + ' / ' + maxScore;
  };

  // ── 토스트 알림 ──
  App.showToast = function (message, type) {
    type = type || 'success';
    var container = document.getElementById('toast-container') || document.body;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);

    // 3초 후 제거 (CSS 애니메이션이 fadeOut 처리)
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  };

  // ── 상태 관리 ──
  App.state = {
    answerKey: {
      '국어': [
        { number: 1, answer: '④', type: 'objective_single' },
        { number: 2, answer: '⑤', type: 'objective_single' },
        { number: 3, answer: '④', type: 'objective_single' },
        { number: 4, answer: '②', type: 'objective_single' },
        { number: 5, answer: '⑤', type: 'objective_single' },
        { number: 6, answer: '㉠ 견문 / ㉡ 여정 / ㉢ 감상', type: 'subjective' },
        { number: 7, answer: '③', type: 'objective_single' },
        { number: 8, answer: '⑤', type: 'objective_single' },
        { number: 9, answer: '참여하겠다.\n참여할 것이다.', type: 'subjective' },
        { number: 10, answer: '④', type: 'objective_single' },
        { number: 11, answer: '⑤', type: 'objective_single' },
        { number: 12, answer: '⑤', type: 'objective_single' },
        { number: 13, answer: '④', type: 'objective_single' },
        { number: 14, answer: '⑤', type: 'objective_single' },
        { number: 15, answer: '③', type: 'objective_single' },
        { number: 16, answer: '비교, 대조', type: 'subjective' },
        { number: 17, answer: '⑤', type: 'objective_single' },
        { number: 18, answer: '의견 모으기', type: 'subjective' },
        { number: 19, answer: '⑤', type: 'objective_single' },
        { number: 20, answer: '②', type: 'objective_single' },
        { number: 21, answer: '①', type: 'objective_single' },
        { number: 22, answer: '④', type: 'objective_single' },
        { number: 23, answer: '⑤', type: 'objective_single' },
        { number: 24, answer: '은유(법)', type: 'subjective' },
        { number: 25, answer: '④', type: 'objective_single' }
      ],
      '수학': [
        { number: 1, answer: '①', type: 'objective_single' },
        { number: 2, answer: '⑤', type: 'objective_single' },
        { number: 3, answer: '③', type: 'objective_single' },
        { number: 4, answer: '16', type: 'subjective' },
        { number: 5, answer: '②', type: 'objective_single' },
        { number: 6, answer: '④', type: 'objective_single' },
        { number: 7, answer: '③', type: 'objective_single' },
        { number: 8, answer: '12', type: 'subjective' },
        { number: 9, answer: '③', type: 'objective_single' },
        { number: 10, answer: '⑤', type: 'objective_single' },
        { number: 11, answer: '③', type: 'objective_single' },
        { number: 12, answer: '④', type: 'objective_single' },
        { number: 13, answer: '②, ⑤', type: 'objective_multiple' },
        { number: 14, answer: '①', type: 'objective_single' },
        { number: 15, answer: '①, ②', type: 'objective_multiple' },
        { number: 16, answer: '④', type: 'objective_single' },
        { number: 17, answer: '④', type: 'objective_single' },
        { number: 18, answer: '③, ④', type: 'objective_multiple' },
        { number: 19, answer: '①', type: 'objective_single' },
        { number: 20, answer: '②', type: 'objective_single' },
        { number: 21, answer: '②', type: 'objective_single' },
        { number: 22, answer: '6', type: 'subjective' },
        { number: 23, answer: '②', type: 'objective_single' },
        { number: 24, answer: '35', type: 'subjective' },
        { number: 25, answer: '48', type: 'subjective' }
      ],
      '영어': [
        { number: 1, answer: '④', type: 'objective_single' },
        { number: 2, answer: '②', type: 'objective_single' },
        { number: 3, answer: '③', type: 'objective_single' },
        { number: 4, answer: '①', type: 'objective_single' },
        { number: 5, answer: '③', type: 'objective_single' },
        { number: 6, answer: '⑤', type: 'objective_single' },
        { number: 7, answer: '①', type: 'objective_single' },
        { number: 8, answer: '④', type: 'objective_single' },
        { number: 9, answer: '③', type: 'objective_single' },
        { number: 10, answer: '⑤', type: 'objective_single' },
        { number: 11, answer: '④', type: 'objective_single' },
        { number: 12, answer: '③', type: 'objective_single' },
        { number: 13, answer: '②', type: 'objective_single' },
        { number: 14, answer: '⑤', type: 'objective_single' },
        { number: 15, answer: '④', type: 'objective_single' },
        { number: 16, answer: '①', type: 'objective_single' },
        { number: 17, answer: '④', type: 'objective_single' },
        { number: 18, answer: '③', type: 'objective_single' },
        { number: 19, answer: '⑤', type: 'objective_single' },
        { number: 20, answer: '⑤', type: 'objective_single' },
        { number: 21, answer: '②', type: 'objective_single' },
        { number: 22, answer: '②', type: 'objective_single' },
        { number: 23, answer: 'I will go to the beach.', type: 'subjective' },
        { number: 24, answer: '(1) ⓑ\n(2) will go', type: 'subjective' },
        { number: 25, answer: 'ⓒ → ⓑ → ⓓ → ⓐ', type: 'subjective' }
      ]
    },
    classNum: 3,        // 담당 학급 (반 번호) - 기본값 3반
    studentCount: 25,   // 학급 학생 수 - 기본값 25명
    studentCounts: { 3: 25 }, // 하위 호환성 유지용 객체
    answers: {}         // 'classNum_subject' → { studentNum: [answer1...answer25] }
  };

  App.saveState = function () {
    try {
      localStorage.setItem(App.STORAGE_KEY, JSON.stringify(App.state));
    } catch (e) {
      console.error('상태 저장 실패:', e);
    }
  };

  App.loadState = function () {
    try {
      var data = localStorage.getItem(App.STORAGE_KEY);
      if (data) {
        var parsed = JSON.parse(data);
        // localStorage에 유효한 정답 데이터가 있는 경우만 로드, 없으면 기본 하드코딩된 정답을 유지
        if (parsed.answerKey && Object.keys(parsed.answerKey).length > 0) {
          App.state.answerKey = parsed.answerKey;
        }
        App.state.classNum = parsed.classNum || 3;
        App.state.studentCount = parsed.studentCount || 25;
        App.state.answers = parsed.answers || {};
      }
      
      // 하위 호환성 및 타 모듈 호환성 동기화
      App.state.studentCounts = {};
      App.state.studentCounts[App.state.classNum] = App.state.studentCount;
      
      App.CLASSES = [App.state.classNum];
    } catch (e) {
      console.error('상태 로드 실패:', e);
    }
  };

  // ── 탭 전환 ──
  App.initTabs = function () {
    var navBtns = document.querySelectorAll('.nav-btn[data-tab]');
    navBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tabName = this.getAttribute('data-tab');
        App.switchTab(tabName);
      });
    });
  };

  App.switchTab = function (tabName) {
    // 네비게이션 버튼 활성화
    var navBtns = document.querySelectorAll('.nav-btn[data-tab]');
    navBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // 탭 콘텐츠 전환
    var tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.id === 'tab-' + tabName);
    });

    // 탭 활성화 콜백 호출
    switch (tabName) {
      case 'answer-key':
        if (window.AnswerKey && AnswerKey.onTabActive) AnswerKey.onTabActive();
        break;
      case 'setup':
        App._renderSetup();
        break;
      case 'grading':
        if (window.Grading && Grading.onTabActive) Grading.onTabActive();
        break;
      case 'results':
        if (window.Results && Results.onTabActive) Results.onTabActive();
        break;
    }
  };

  // ── 반 설정 (Setup 탭) ──
  App._renderSetup = function () {
    var classNumInput = document.getElementById('setup-class-num');
    var studentCountInput = document.getElementById('setup-student-count');
    
    if (classNumInput) classNumInput.value = App.state.classNum;
    if (studentCountInput) studentCountInput.value = App.state.studentCount;
  };

  App._initSetup = function () {
    var classNumInput = document.getElementById('setup-class-num');
    var studentCountInput = document.getElementById('setup-student-count');
    var saveBtn = document.getElementById('save-setup-btn');

    // 설정 저장 버튼
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        
        var classNum = parseInt(classNumInput.value) || 3;
        var studentCount = parseInt(studentCountInput.value) || 25;

        if (classNum < 1) classNum = 1;
        if (classNum > 20) classNum = 20;
        if (studentCount < 1) studentCount = 1;
        if (studentCount > 50) studentCount = 50;

        App.state.classNum = classNum;
        App.state.studentCount = studentCount;

        // 하위 호환성 동기화
        App.state.studentCounts = {};
        App.state.studentCounts[classNum] = studentCount;
        App.CLASSES = [classNum];

        App.saveState();
        App.showToast('시험 설정이 저장되었습니다.', 'success');
        
        // 답안 입력 셀렉트 박스 갱신을 위해 활성 탭 재트리거
        if (window.Grading && Grading.onTabActive) {
          Grading.onTabActive();
        }
      });
    }

    // 초기 렌더링
    App._renderSetup();
  };

  // ── 초기화 ──
  App.init = function () {
    App.loadState();
    App.initTabs();
    App._initSetup();

    if (window.AnswerKey) AnswerKey.init();
    if (window.Grading) Grading.init();
    if (window.Results) Results.init();
    if (window.ExcelExport) ExcelExport.init();
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

  // ============================================================
  // Dashboard 네임스페이스 — 대시보드 렌더링
  // ============================================================
  var Dashboard = {};
  window.Dashboard = Dashboard;

  Dashboard.render = function () {
    var container = document.getElementById('dashboard-content');
    if (!container) return;

    var html = '';

    // ── 상단: 통계 카드 ──
    var hasAnswerKey = Object.keys(App.state.answerKey).length > 0;
    var totalStudents = 0;
    App.CLASSES.forEach(function (c) {
      totalStudents += (App.state.studentCounts[c] || 25);
    });

    // 채점 진행률 계산
    var totalSessions = App.CLASSES.length * App.SUBJECTS.length; // 18
    var completedSessions = 0;
    App.CLASSES.forEach(function (c) {
      App.SUBJECTS.forEach(function (s) {
        var key = c + '_' + s;
        if (App.state.answers[key]) {
          var studentCount = App.state.studentCounts[c] || 25;
          var answeredCount = Object.keys(App.state.answers[key]).length;
          // 모든 학생이 답안 입력되면 완료
          if (answeredCount >= studentCount) {
            completedSessions++;
          }
        }
      });
    });
    var progressPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // 부분 진행 학생 수
    var gradedStudentAnswers = 0;
    var totalStudentAnswers = totalStudents * App.SUBJECTS.length;
    App.CLASSES.forEach(function (c) {
      App.SUBJECTS.forEach(function (s) {
        var key = c + '_' + s;
        if (App.state.answers[key]) {
          gradedStudentAnswers += Object.keys(App.state.answers[key]).length;
        }
      });
    });

    html += '<div class="stat-cards">';

    // 카드 1: 정답 등록 여부
    html += '<div class="stat-card' + (hasAnswerKey ? ' stat-card-success' : ' stat-card-warning') + '">';
    html += '<div class="stat-icon">' + (hasAnswerKey ? '✅' : '📋') + '</div>';
    html += '<div class="stat-value">' + (hasAnswerKey ? '등록 완료' : '미등록') + '</div>';
    html += '<div class="stat-label">정답 키</div>';
    html += '</div>';

    // 카드 2: 채점 진행률
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">📊</div>';
    html += '<div class="stat-value">' + progressPercent + '%</div>';
    html += '<div class="stat-label">채점 진행률 (' + completedSessions + '/' + totalSessions + ')</div>';
    html += '</div>';

    // 카드 3: 총 학생 수
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">👥</div>';
    html += '<div class="stat-value">' + totalStudents + '명</div>';
    html += '<div class="stat-label">총 학생 수</div>';
    html += '</div>';

    // 카드 4: 채점 완료 건수
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">✏️</div>';
    html += '<div class="stat-value">' + gradedStudentAnswers + ' / ' + totalStudentAnswers + '</div>';
    html += '<div class="stat-label">채점 완료 (학생×과목)</div>';
    html += '</div>';

    html += '</div>'; // .stat-cards

    // ── 중간: 반별 채점 현황 테이블 ──
    html += '<div class="dashboard-section">';
    html += '<h3 class="section-title">📋 반별 채점 현황</h3>';
    html += '<div class="table-wrapper">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>반</th><th>학생 수</th>';
    App.SUBJECTS.forEach(function (s) {
      html += '<th>' + s + '</th>';
    });
    html += '<th>전체</th></tr></thead>';
    html += '<tbody>';

    App.CLASSES.forEach(function (c) {
      var studentCount = App.state.studentCounts[c] || 25;
      html += '<tr><td><strong>' + c + '반</strong></td>';
      html += '<td>' + studentCount + '명</td>';

      var classTotal = 0;
      var classDone = 0;

      App.SUBJECTS.forEach(function (s) {
        var key = c + '_' + s;
        var answered = App.state.answers[key] ? Object.keys(App.state.answers[key]).length : 0;
        var pct = Math.round((answered / studentCount) * 100);
        classTotal += studentCount;
        classDone += answered;

        var statusClass = '';
        if (pct === 100) statusClass = 'status-complete';
        else if (pct > 0) statusClass = 'status-progress';
        else statusClass = 'status-pending';

        html += '<td><span class="progress-badge ' + statusClass + '">' + answered + '/' + studentCount + ' (' + pct + '%)</span></td>';
      });

      var totalPct = classTotal > 0 ? Math.round((classDone / classTotal) * 100) : 0;
      html += '<td><strong>' + totalPct + '%</strong></td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div></div>';

    // ── 하단: 빠른 시작 가이드 ──
    html += '<div class="dashboard-section">';
    html += '<h3 class="section-title">🚀 빠른 시작 가이드</h3>';
    html += '<div class="quick-guide">';

    if (!hasAnswerKey) {
      html += '<div class="guide-step guide-step-active">';
      html += '<div class="guide-step-number">1</div>';
      html += '<div class="guide-step-content">';
      html += '<strong>정답 엑셀을 업로드하세요</strong>';
      html += '<p>상단 <em>정답 등록</em> 탭에서 정답 파일(test_answer.xlsx)을 드래그하거나 클릭하여 업로드합니다.</p>';
      html += '</div></div>';
    } else {
      html += '<div class="guide-step guide-step-done">';
      html += '<div class="guide-step-number">✓</div>';
      html += '<div class="guide-step-content">';
      html += '<strong>정답 등록 완료</strong>';
      html += '<p>정답이 성공적으로 등록되었습니다.</p>';
      html += '</div></div>';
    }

    html += '<div class="guide-step' + (hasAnswerKey && completedSessions === 0 ? ' guide-step-active' : '') + '">';
    html += '<div class="guide-step-number">2</div>';
    html += '<div class="guide-step-content">';
    html += '<strong>반 설정을 확인하세요</strong>';
    html += '<p><em>반 설정</em> 탭에서 각 반의 학생 수를 확인하고 저장합니다.</p>';
    html += '</div></div>';

    html += '<div class="guide-step' + (hasAnswerKey && completedSessions < totalSessions ? ' guide-step-active' : '') + '">';
    html += '<div class="guide-step-number">3</div>';
    html += '<div class="guide-step-content">';
    html += '<strong>채점을 시작하세요</strong>';
    html += '<p><em>채점 입력</em> 탭에서 반과 과목을 선택하고 키보드로 빠르게 채점합니다.</p>';
    html += '<p class="guide-hint">객관식: 키보드 1~5 | 주관식/복수정답: O 또는 X</p>';
    html += '</div></div>';

    html += '<div class="guide-step' + (completedSessions === totalSessions && completedSessions > 0 ? ' guide-step-active' : '') + '">';
    html += '<div class="guide-step-number">4</div>';
    html += '<div class="guide-step-content">';
    html += '<strong>결과를 확인하고 내보내세요</strong>';
    html += '<p><em>성적 분석</em> 탭에서 결과를 확인하고 엑셀로 다운로드합니다.</p>';
    html += '</div></div>';

    html += '</div></div>';

    container.innerHTML = html;
  };
})();
