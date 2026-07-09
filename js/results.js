// ============================================================
// results.js — 성적 분석 및 차트
// ============================================================

(function () {
  'use strict';

  var Results = {};
  window.Results = Results;

  // 차트 인스턴스 저장 (재렌더링 시 destroy 용)
  Results._charts = [];

  // ── 초기화 ──
  Results.init = function () {
    var viewSelect = document.getElementById('results-view-select');
    var subjectFilter = document.getElementById('results-subject-filter');

    // 이벤트 리스너
    if (viewSelect) {
      viewSelect.addEventListener('change', function () {
        Results._render();
      });
    }

    if (subjectFilter) {
      subjectFilter.addEventListener('change', function () {
        Results._render();
      });
    }

    Results._updateSelectors();
  };

  // ── 셀렉트 박스 필터 동기화 ──
  Results._updateSelectors = function () {
    var subjectFilter = document.getElementById('results-subject-filter');

    if (subjectFilter && subjectFilter.options.length === 0) {
      App.SUBJECTS.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        subjectFilter.appendChild(opt);
      });
    }
  };

  Results.onTabActive = function () {
    Results._updateSelectors();
    Results._render();
  };

  // ── 메인 렌더 분기 ──
  Results._render = function () {
    var viewSelect = document.getElementById('results-view-select');
    var view = viewSelect ? viewSelect.value : 'class';

    var subjectFilter = document.getElementById('results-subject-filter');
    var subject = subjectFilter ? subjectFilter.value : '';

    // 문항 분석일 때만 과목 선택란 표시
    if (subjectFilter) {
      subjectFilter.style.display = (view === 'item-analysis') ? 'inline-block' : 'none';
    }

    switch (view) {
      case 'class':
        Results.renderClassView(App.state.classNum);
        break;
      case 'item-analysis':
        Results.renderItemAnalysis(subject || App.SUBJECTS[0]);
        break;
      default:
        Results.renderClassView(App.state.classNum);
    }

    Results.renderCharts();
  };

  // ── 점수 계산 ──
  Results.calculateScores = function () {
    var scores = {};
    // { classNum: { studentNum: { 국어: score, 수학: score, 영어: score, total, avg, rank } } }

    var allStudentScores = []; // 전체 석차 계산용

    App.CLASSES.forEach(function (c) {
      scores[c] = {};
      var studentCount = App.state.studentCounts[c] || 25;

      for (var s = 1; s <= studentCount; s++) {
        scores[c][s] = {};
        var total = 0;
        var totalCorrect = 0;

        App.SUBJECTS.forEach(function (subject) {
          var key = c + '_' + subject;
          var answerKey = App.state.answerKey[subject] || [];
          var studentAnswers = (App.state.answers[key] && App.state.answers[key][s]) || [];
          var subjectScore = 0;
          var subjectCorrect = 0;

          for (var q = 0; q < App.QUESTIONS_PER_SUBJECT; q++) {
            var answer = studentAnswers[q];
            var correct = answerKey[q];
            if (!correct || answer === null || answer === undefined) continue;

            if (correct.type === 'objective_single') {
              // 학생답(1~5)을 정답 원문자의 숫자와 비교
              var correctNum = App.CIRCLE_TO_NUM[correct.answer];
              if (answer === correctNum) {
                subjectScore += App.POINTS_PER_QUESTION;
                subjectCorrect++;
              }
            } else {
              // 주관식/복수정답: true → 정답
              if (answer === true) {
                subjectScore += App.POINTS_PER_QUESTION;
                subjectCorrect++;
              }
            }
          }

          scores[c][s][subject] = subjectScore;
          scores[c][s][subject + '_정답수'] = subjectCorrect;
          total += subjectScore;
          totalCorrect += subjectCorrect;
        });

        scores[c][s].total = total;
        scores[c][s].totalCorrect = totalCorrect;
        scores[c][s].avg = Math.round((total / App.SUBJECTS.length) * 10) / 10;

        allStudentScores.push({
          classNum: c,
          studentNum: s,
          total: total
        });
      }
    });

    // 전체 석차 계산
    allStudentScores.sort(function (a, b) { return b.total - a.total; });
    var rank = 1;
    for (var i = 0; i < allStudentScores.length; i++) {
      if (i > 0 && allStudentScores[i].total < allStudentScores[i - 1].total) {
        rank = i + 1;
      }
      var entry = allStudentScores[i];
      scores[entry.classNum][entry.studentNum].rank = rank;
    }

    // 반별 석차 계산
    App.CLASSES.forEach(function (c) {
      var classStudents = [];
      var studentCount = App.state.studentCounts[c] || 25;
      for (var s = 1; s <= studentCount; s++) {
        classStudents.push({ studentNum: s, total: scores[c][s].total });
      }
      classStudents.sort(function (a, b) { return b.total - a.total; });

      var classRank = 1;
      for (var j = 0; j < classStudents.length; j++) {
        if (j > 0 && classStudents[j].total < classStudents[j - 1].total) {
          classRank = j + 1;
        }
        scores[c][classStudents[j].studentNum].classRank = classRank;
      }
    });

    return scores;
  };

  // ── 전체 개요 렌더링 ──
  Results.renderOverview = function () {
    var container = document.getElementById('results-content');
    if (!container) return;

    var hasAnswerKey = App.state.answerKey && Object.keys(App.state.answerKey).length > 0;
    var hasAnswers = App.state.answers && Object.keys(App.state.answers).length > 0;

    if (!hasAnswerKey || !hasAnswers) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>채점 데이터가 없습니다.</p><p>정답을 등록하고 채점을 진행해주세요.</p></div>';
      return;
    }

    var scores = Results.calculateScores();
    var html = '';

    // ── 과목별 평균 점수 카드 ──
    html += '<div class="stat-cards">';
    App.SUBJECTS.forEach(function (subject) {
      var total = 0;
      var count = 0;
      App.CLASSES.forEach(function (c) {
        var studentCount = App.state.studentCounts[c] || 25;
        for (var s = 1; s <= studentCount; s++) {
          if (scores[c] && scores[c][s] && scores[c][s][subject] !== undefined) {
            total += scores[c][s][subject];
            count++;
          }
        }
      });
      var avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

      html += '<div class="stat-card">';
      html += '<div class="stat-icon">📝</div>';
      html += '<div class="stat-value">' + avg + '점</div>';
      html += '<div class="stat-label">' + subject + ' 전체 평균</div>';
      html += '</div>';
    });

    // 총점 평균
    var grandTotal = 0;
    var grandCount = 0;
    App.CLASSES.forEach(function (c) {
      var studentCount = App.state.studentCounts[c] || 25;
      for (var s = 1; s <= studentCount; s++) {
        if (scores[c] && scores[c][s]) {
          grandTotal += scores[c][s].total;
          grandCount++;
        }
      }
    });
    var grandAvg = grandCount > 0 ? Math.round((grandTotal / grandCount) * 10) / 10 : 0;
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">🏆</div>';
    html += '<div class="stat-value">' + grandAvg + '점</div>';
    html += '<div class="stat-label">총점 전체 평균 (300점 만점)</div>';
    html += '</div>';

    html += '</div>'; // .stat-cards

    // ── 반별 평균 비교 표 ──
    html += '<div class="results-section">';
    html += '<h3 class="section-title">📋 반별 평균 비교</h3>';
    html += '<div class="table-wrapper">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>반</th>';
    App.SUBJECTS.forEach(function (s) { html += '<th>' + s + '</th>'; });
    html += '<th>총점 평균</th></tr></thead>';
    html += '<tbody>';

    App.CLASSES.forEach(function (c) {
      html += '<tr><td><strong>' + c + '반</strong></td>';
      var classTotal = 0;
      var classCount = App.state.studentCounts[c] || 25;

      App.SUBJECTS.forEach(function (subject) {
        var subTotal = 0;
        for (var s = 1; s <= classCount; s++) {
          if (scores[c] && scores[c][s]) {
            subTotal += scores[c][s][subject] || 0;
          }
        }
        var subAvg = classCount > 0 ? Math.round((subTotal / classCount) * 10) / 10 : 0;
        classTotal += subTotal;

        var colorClass = Results._getScoreColorClass(subAvg, 100);
        html += '<td class="' + colorClass + '">' + subAvg + '</td>';
      });

      var totalAvg = classCount > 0 ? Math.round((classTotal / classCount) * 10) / 10 : 0;
      html += '<td><strong>' + totalAvg + '</strong></td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div></div>';

    // ── 전체 석차 Top 10 ──
    html += '<div class="results-section">';
    html += '<h3 class="section-title">🏅 전체 석차 Top 10</h3>';
    html += '<div class="table-wrapper">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>석차</th><th>반</th><th>번호</th>';
    App.SUBJECTS.forEach(function (s) { html += '<th>' + s + '</th>'; });
    html += '<th>총점</th><th>평균</th></tr></thead>';
    html += '<tbody>';

    var allStudents = [];
    App.CLASSES.forEach(function (c) {
      var studentCount = App.state.studentCounts[c] || 25;
      for (var s = 1; s <= studentCount; s++) {
        if (scores[c] && scores[c][s]) {
          allStudents.push({
            classNum: c,
            studentNum: s,
            data: scores[c][s]
          });
        }
      }
    });
    allStudents.sort(function (a, b) { return b.data.total - a.data.total; });

    var top10 = allStudents.slice(0, 10);
    top10.forEach(function (st) {
      html += '<tr>';
      html += '<td><strong>' + st.data.rank + '</strong></td>';
      html += '<td>' + st.classNum + '반</td>';
      html += '<td>' + st.studentNum + '번</td>';
      App.SUBJECTS.forEach(function (subject) {
        var sc = st.data[subject] || 0;
        var colorClass = Results._getScoreColorClass(sc, 100);
        html += '<td class="' + colorClass + '">' + sc + '</td>';
      });
      html += '<td><strong>' + st.data.total + '</strong></td>';
      html += '<td>' + st.data.avg + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div></div>';

    container.innerHTML = html;
  };

  // ── 반별 성적 뷰 ──
  Results.renderClassView = function (classNum) {
    var container = document.getElementById('results-content');
    if (!container) return;

    if (!classNum) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>반을 선택해주세요.</p></div>';
      return;
    }

    var scores = Results.calculateScores();
    var studentCount = App.state.studentCounts[classNum] || 25;
    var html = '';

    html += '<div class="results-section">';
    html += '<h3 class="section-title">📋 ' + classNum + '반 성적표</h3>';
    html += '<div class="table-wrapper">';
    html += '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th>번호</th>';
    App.SUBJECTS.forEach(function (s) { html += '<th>' + s + '</th>'; });
    html += '<th>맞춘 문항수</th><th>총점</th><th>평균</th><th>반 석차</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    for (var s = 1; s <= studentCount; s++) {
      var sd = scores[classNum] ? scores[classNum][s] : null;
      if (!sd) continue;

      html += '<tr>';
      html += '<td>' + s + '번</td>';

      App.SUBJECTS.forEach(function (subject) {
        var sc = sd[subject] || 0;
        var colorClass = Results._getScoreColorClass(sc, 100);
        html += '<td class="' + colorClass + '">' + sc + '</td>';
      });

      var totalQ = App.SUBJECTS.length * App.QUESTIONS_PER_SUBJECT; // 75
      html += '<td>' + (sd.totalCorrect || 0) + ' / ' + totalQ + '</td>';
      html += '<td><strong>' + sd.total + '</strong></td>';
      html += '<td>' + sd.avg + '</td>';
      html += '<td>' + (sd.classRank || '-') + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div></div>';

    // 반 통계 요약
    var classScores = [];
    for (var st = 1; st <= studentCount; st++) {
      if (scores[classNum] && scores[classNum][st]) {
        classScores.push(scores[classNum][st].total);
      }
    }
    if (classScores.length > 0) {
      var max = Math.max.apply(null, classScores);
      var min = Math.min.apply(null, classScores);
      var sum = classScores.reduce(function (a, b) { return a + b; }, 0);
      var avg = Math.round((sum / classScores.length) * 10) / 10;
      var variance = classScores.reduce(function (a, b) { return a + Math.pow(b - avg, 2); }, 0) / classScores.length;
      var stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

      html += '<div class="results-section">';
      html += '<h3 class="section-title">📊 ' + classNum + '반 통계</h3>';
      html += '<div class="stat-cards">';
      html += '<div class="stat-card"><div class="stat-value">' + avg + '</div><div class="stat-label">평균</div></div>';
      html += '<div class="stat-card"><div class="stat-value">' + max + '</div><div class="stat-label">최고점</div></div>';
      html += '<div class="stat-card"><div class="stat-value">' + min + '</div><div class="stat-label">최저점</div></div>';
      html += '<div class="stat-card"><div class="stat-value">' + stdDev + '</div><div class="stat-label">표준편차</div></div>';
      html += '</div></div>';
    }

    container.innerHTML = html;
  };

  // ── 문항별 분석 뷰 ──
  Results.renderItemAnalysis = function (subject) {
    var container = document.getElementById('results-content');
    if (!container) return;

    if (!subject) {
      // 과목 미선택 → 전체 과목 표시
      subject = App.SUBJECTS[0];
    }

    var hasAnswerKey = App.state.answerKey && App.state.answerKey[subject];
    if (!hasAnswerKey) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>정답 데이터가 없습니다.</p></div>';
      return;
    }

    var answerKey = App.state.answerKey[subject];
    var html = '';

    html += '<div class="results-section">';
    html += '<h3 class="section-title">📊 ' + subject + ' 문항별 정답률</h3>';
    html += '<div class="table-wrapper">';
    html += '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th>문항</th><th>정답</th><th>유형</th><th>전체 정답률</th>';
    App.CLASSES.forEach(function (c) { html += '<th>' + c + '반</th>'; });
    html += '</tr></thead>';
    html += '<tbody>';

    for (var q = 0; q < App.QUESTIONS_PER_SUBJECT; q++) {
      var question = answerKey[q];
      if (!question) continue;

      // 전체 및 반별 정답률 계산
      var totalCorrect = 0;
      var totalStudents = 0;
      var classPcts = {};

      App.CLASSES.forEach(function (c) {
        var key = c + '_' + subject;
        var studentCount = App.state.studentCounts[c] || 25;
        var classCorrect = 0;
        var classAnswered = 0;

        for (var s = 1; s <= studentCount; s++) {
          if (App.state.answers[key] && App.state.answers[key][s]) {
            var answer = App.state.answers[key][s][q];
            if (answer === null || answer === undefined) continue;

            classAnswered++;
            totalStudents++;

            if (question.type === 'objective_single') {
              var correctNum = App.CIRCLE_TO_NUM[question.answer];
              if (answer === correctNum) {
                classCorrect++;
                totalCorrect++;
              }
            } else {
              if (answer === true) {
                classCorrect++;
                totalCorrect++;
              }
            }
          }
        }

        classPcts[c] = classAnswered > 0 ? Math.round((classCorrect / classAnswered) * 100) : '-';
      });

      var totalPct = totalStudents > 0 ? Math.round((totalCorrect / totalStudents) * 100) : '-';

      // 정답률 낮은 문항 하이라이트
      var rowClass = (typeof totalPct === 'number' && totalPct < 40) ? ' class="low-rate-row"' : '';

      html += '<tr' + rowClass + '>';
      html += '<td>' + question.number + '</td>';

      // 정답 표시 (긴 텍스트 줄임)
      var ansDisplay = question.answer;
      if (ansDisplay.length > 15) ansDisplay = ansDisplay.substring(0, 15) + '…';
      html += '<td title="' + question.answer.replace(/"/g, '&quot;') + '">' + ansDisplay + '</td>';

      // 유형 뱃지
      var typeLabel = question.type === 'objective_single' ? '객관식' : (question.type === 'objective_multiple' ? '복수정답' : '서술형');
      var typeBadge = question.type === 'objective_single' ? 'question-type-badge objective' : (question.type === 'objective_multiple' ? 'question-type-badge objective-multi' : 'question-type-badge subjective');
      html += '<td><span class="' + typeBadge + '">' + typeLabel + '</span></td>';

      // 전체 정답률
      var pctColor = typeof totalPct === 'number' ? Results._getScoreColorClass(totalPct, 100) : '';
      html += '<td class="' + pctColor + '"><strong>' + (typeof totalPct === 'number' ? totalPct + '%' : '-') + '</strong></td>';

      // 반별 정답률
      App.CLASSES.forEach(function (c) {
        var pct = classPcts[c];
        var color = typeof pct === 'number' ? Results._getScoreColorClass(pct, 100) : '';
        html += '<td class="' + color + '">' + (typeof pct === 'number' ? pct + '%' : '-') + '</td>';
      });

      html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div></div>';

    container.innerHTML = html;
  };

  // ── 차트 렌더링 ──
  Results.renderCharts = function () {
    var container = document.getElementById('charts-container');
    if (!container) return;

    // 기존 차트 제거
    Results._charts.forEach(function (chart) {
      if (chart && chart.destroy) chart.destroy();
    });
    Results._charts = [];

    var hasAnswerKey = App.state.answerKey && Object.keys(App.state.answerKey).length > 0;
    var hasAnswers = App.state.answers && Object.keys(App.state.answers).length > 0;

    if (!hasAnswerKey || !hasAnswers || typeof Chart === 'undefined') {
      container.innerHTML = '';
      return;
    }

    var scores = Results.calculateScores();

    // 차트 컨테이너 HTML
    var html = '';
    html += '<div class="charts-grid">';
    html += '<div class="chart-card"><h4 class="chart-title">과목별 평균 비교</h4><canvas id="chart-subject-avg"></canvas></div>';
    html += '<div class="chart-card"><h4 class="chart-title">과목별 점수 분포</h4><canvas id="chart-subject-dist"></canvas></div>';
    html += '<div class="chart-card chart-card-wide"><h4 class="chart-title">문항별 정답률 (' + (App.SUBJECTS[0] || '') + ')</h4><canvas id="chart-item-rate"></canvas></div>';
    html += '</div>';
    container.innerHTML = html;

    // Chart.js 다크 테마 기본 설정
    Chart.defaults.color = 'rgba(255, 255, 255, 0.8)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    var chartColors = [
      'rgba(99, 102, 241, 0.8)',   // 인디고
      'rgba(236, 72, 153, 0.8)',   // 핑크
      'rgba(34, 197, 94, 0.8)',    // 그린
      'rgba(251, 146, 60, 0.8)',   // 오렌지
      'rgba(14, 165, 233, 0.8)',   // 스카이
      'rgba(168, 85, 247, 0.8)'    // 퍼플
    ];

    // ── 차트 1: 과목별 평균 비교 (막대) ──
    var ctx1 = document.getElementById('chart-subject-avg');
    if (ctx1) {
      var classNum = App.state.classNum;
      var studentCount = App.state.studentCounts[classNum] || 25;
      var subjectAvgs = [];

      App.SUBJECTS.forEach(function (subject) {
        var total = 0;
        for (var s = 1; s <= studentCount; s++) {
          total += (scores[classNum] && scores[classNum][s] && scores[classNum][s][subject]) || 0;
        }
        subjectAvgs.push(Math.round((total / studentCount) * 10) / 10);
      });

      var chart1 = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: App.SUBJECTS,
          datasets: [{
            label: '학급 평균 (점)',
            data: subjectAvgs,
            backgroundColor: [chartColors[0], chartColors[1], chartColors[2]],
            borderColor: [
              chartColors[0].replace('0.8', '1'),
              chartColors[1].replace('0.8', '1'),
              chartColors[2].replace('0.8', '1')
            ],
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
      Results._charts.push(chart1);
    }

    // ── 차트 2: 과목별 점수 분포 (박스플롯 대신 히스토그램 형태의 평균) ──
    var ctx2 = document.getElementById('chart-subject-dist');
    if (ctx2) {
      var subjectData = {};
      App.SUBJECTS.forEach(function (subject) {
        subjectData[subject] = [];
        App.CLASSES.forEach(function (c) {
          var studentCount = App.state.studentCounts[c] || 25;
          for (var s = 1; s <= studentCount; s++) {
            var sc = (scores[c] && scores[c][s] && scores[c][s][subject]) || 0;
            subjectData[subject].push(sc);
          }
        });
      });

      // 점수 구간별 학생 수 (0-20, 21-40, 41-60, 61-80, 81-100)
      var ranges = ['0~20', '21~40', '41~60', '61~80', '81~100'];
      var rangeDatasets = App.SUBJECTS.map(function (subject, idx) {
        var counts = [0, 0, 0, 0, 0];
        subjectData[subject].forEach(function (sc) {
          if (sc <= 20) counts[0]++;
          else if (sc <= 40) counts[1]++;
          else if (sc <= 60) counts[2]++;
          else if (sc <= 80) counts[3]++;
          else counts[4]++;
        });
        return {
          label: subject,
          data: counts,
          backgroundColor: chartColors[idx],
          borderColor: chartColors[idx].replace('0.8', '1'),
          borderWidth: 1,
          borderRadius: 4
        };
      });

      var chart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ranges,
          datasets: rangeDatasets
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: '점수 구간별 학생 분포', color: 'rgba(255,255,255,0.7)' }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: '학생 수', color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
      Results._charts.push(chart2);
    }

    // ── 차트 3: 문항별 정답률 (첫 번째 과목) ──
    var ctx3 = document.getElementById('chart-item-rate');
    if (ctx3) {
      var firstSubject = App.SUBJECTS[0];
      var answerKey = App.state.answerKey[firstSubject] || [];
      var itemRates = [];
      var itemLabels = [];
      var itemColors = [];

      for (var q = 0; q < App.QUESTIONS_PER_SUBJECT; q++) {
        var question = answerKey[q];
        if (!question) { itemRates.push(0); itemLabels.push((q + 1) + '번'); itemColors.push(chartColors[0]); continue; }

        itemLabels.push((q + 1) + '번');
        var correct = 0;
        var total = 0;

        App.CLASSES.forEach(function (c) {
          var key = c + '_' + firstSubject;
          var studentCount = App.state.studentCounts[c] || 25;

          for (var s = 1; s <= studentCount; s++) {
            if (App.state.answers[key] && App.state.answers[key][s]) {
              var answer = App.state.answers[key][s][q];
              if (answer === null || answer === undefined) return;
              total++;

              if (question.type === 'objective_single') {
                var correctNum = App.CIRCLE_TO_NUM[question.answer];
                if (answer === correctNum) correct++;
              } else {
                if (answer === true) correct++;
              }
            }
          }
        });

        var rate = total > 0 ? Math.round((correct / total) * 100) : 0;
        itemRates.push(rate);
        // 낮은 정답률은 빨간색
        if (rate < 40) itemColors.push('rgba(239, 68, 68, 0.8)');
        else if (rate < 60) itemColors.push('rgba(251, 146, 60, 0.8)');
        else itemColors.push('rgba(34, 197, 94, 0.8)');
      }

      var chart3 = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: itemLabels,
          datasets: [{
            label: '정답률 (%)',
            data: itemRates,
            backgroundColor: itemColors,
            borderColor: itemColors.map(function (c) { return c.replace('0.8', '1'); }),
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: '정답률 (%)', color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
      Results._charts.push(chart3);
    }
  };

  // ── 점수에 따른 색상 클래스 ──
  Results._getScoreColorClass = function (score, maxScore) {
    var pct = (score / maxScore) * 100;
    if (pct >= 90) return 'score-excellent';
    if (pct >= 70) return 'score-good';
    if (pct >= 50) return 'score-average';
    if (pct >= 30) return 'score-below';
    return 'score-low';
  };
})();
