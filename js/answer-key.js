// ============================================================
// answer-key.js — 정답 엑셀 파싱 및 표시
// ============================================================

(function () {
  'use strict';

  var AnswerKey = {};
  window.AnswerKey = AnswerKey;

  // ── 초기화 ──
  AnswerKey.init = function () {
    // 앱 시작 시 하드코딩된 정답 테이블 렌더링
    AnswerKey.renderAnswerKeyTables();
  };

  AnswerKey.onTabActive = function () {
    // 탭 활성화 시 테이블 갱신
    if (App.state.answerKey && Object.keys(App.state.answerKey).length > 0) {
      AnswerKey.renderAnswerKeyTables();
    }
  };

  // ── 정답 테이블 렌더링 ──
  AnswerKey.renderAnswerKeyTables = function () {
    var container = document.getElementById('answer-key-tables');
    if (!container) return;

    var answerKey = App.state.answerKey;
    if (!answerKey || Object.keys(answerKey).length === 0) {
      container.innerHTML = '<p class="empty-message">정답이 등록되지 않았습니다. 위에서 엑셀 파일을 업로드하세요.</p>';
      return;
    }

    var html = '';

    // 과목별 탭 네비게이션
    html += '<div class="answer-key-tabs">';
    App.SUBJECTS.forEach(function (subject, idx) {
      html += '<button class="answer-tab-btn' + (idx === 0 ? ' active' : '') + '" data-subject="' + subject + '">' + subject + '</button>';
    });
    html += '</div>';

    // 과목별 테이블
    App.SUBJECTS.forEach(function (subject, idx) {
      var questions = answerKey[subject] || [];
      html += '<div class="answer-key-table-wrap' + (idx === 0 ? ' active' : '') + '" data-subject="' + subject + '">';
      html += '<table class="data-table answer-key-table">';
      html += '<thead><tr>';
      html += '<th class="col-num">문항</th>';
      html += '<th class="col-answer">정답</th>';
      html += '<th class="col-type">유형</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      questions.forEach(function (q) {
        var typeBadge = '';
        var typeLabel = '';
        switch (q.type) {
          case 'objective_single':
            typeBadge = 'question-type-badge objective';
            typeLabel = '객관식';
            break;
          case 'objective_multiple':
            typeBadge = 'question-type-badge objective-multi';
            typeLabel = '복수정답';
            break;
          case 'subjective':
            typeBadge = 'question-type-badge subjective';
            typeLabel = '서술형';
            break;
        }

        // 정답 텍스트 (줄바꿈 처리)
        var answerDisplay = q.answer.replace(/\n/g, '<br>');

        html += '<tr>';
        html += '<td class="col-num">' + q.number + '</td>';
        html += '<td class="col-answer">' + answerDisplay + '</td>';
        html += '<td class="col-type"><span class="' + typeBadge + '">' + typeLabel + '</span></td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div>';
    });

    container.innerHTML = html;

    // 과목 탭 클릭 이벤트
    var tabBtns = container.querySelectorAll('.answer-tab-btn');
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var subject = this.getAttribute('data-subject');

        // 활성 탭 전환
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        // 테이블 전환
        var wraps = container.querySelectorAll('.answer-key-table-wrap');
        wraps.forEach(function (w) {
          w.classList.toggle('active', w.getAttribute('data-subject') === subject);
        });
      });
    });
  };
})();
