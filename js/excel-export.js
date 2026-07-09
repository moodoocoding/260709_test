// ============================================================
// excel-export.js — 엑셀 파일 생성 및 다운로드
// ============================================================

(function () {
  'use strict';

  var ExcelExport = {};
  window.ExcelExport = ExcelExport;

  // ── 초기화 ──
  ExcelExport.init = function () {
    var exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        ExcelExport.generate();
      });
    }
  };

  // ── 엑셀 생성 ──
  ExcelExport.generate = function () {
    if (typeof XLSX === 'undefined') {
      App.showToast('SheetJS 라이브러리가 로드되지 않았습니다.', 'error');
      return;
    }

    var hasAnswerKey = App.state.answerKey && Object.keys(App.state.answerKey).length > 0;
    var hasAnswers = App.state.answers && Object.keys(App.state.answers).length > 0;

    if (!hasAnswerKey || !hasAnswers) {
      App.showToast('채점 데이터가 없습니다. 정답 등록 및 채점을 먼저 진행해주세요.', 'error');
      return;
    }

    try {
      var scores = Results.calculateScores();
      var wb = XLSX.utils.book_new();

      // ── 시트 1: 전체성적 ──
      ExcelExport._addOverallSheet(wb, scores);

      // ── 시트 2~7: 반별 성적 ──
      App.CLASSES.forEach(function (c) {
        ExcelExport._addClassSheet(wb, scores, c);
      });

      // ── 시트 8~10: 문항분석 ──
      App.SUBJECTS.forEach(function (subject) {
        ExcelExport._addItemAnalysisSheet(wb, subject);
      });

      // ── 시트 11: 과목통계 ──
      ExcelExport._addStatisticsSheet(wb, scores);

      // 다운로드
      ExcelExport.download(wb);
      App.showToast('엑셀 파일이 다운로드되었습니다! 📥', 'success');

    } catch (err) {
      console.error('엑셀 생성 오류:', err);
      App.showToast('엑셀 생성 중 오류가 발생했습니다: ' + err.message, 'error');
    }
  };

  // ── 전체성적 시트 ──
  ExcelExport._addOverallSheet = function (wb, scores) {
    var data = [];
    var header = ['반', '번호'];
    App.SUBJECTS.forEach(function (s) { header.push(s); });
    header.push('총점', '평균', '전체석차');
    data.push(header);

    // 모든 학생 데이터
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

    // 총점 기준 정렬 (석차 순)
    allStudents.sort(function (a, b) { return a.data.rank - b.data.rank; });

    allStudents.forEach(function (st) {
      var row = [st.classNum, st.studentNum];
      App.SUBJECTS.forEach(function (subject) {
        row.push(st.data[subject] || 0);
      });
      row.push(st.data.total, st.data.avg, st.data.rank);
      data.push(row);
    });

    var ws = XLSX.utils.aoa_to_sheet(data);
    ExcelExport._setColumnWidths(ws, [6, 6, 8, 8, 8, 8, 8, 10]);
    ExcelExport._boldHeader(ws, header.length);
    XLSX.utils.book_append_sheet(wb, ws, '전체성적');
  };

  // ── 반별 성적 시트 ──
  ExcelExport._addClassSheet = function (wb, scores, classNum) {
    var data = [];
    var header = ['번호'];
    App.SUBJECTS.forEach(function (s) { header.push(s); });
    header.push('총점', '평균', '반석차');
    data.push(header);

    var studentCount = App.state.studentCounts[classNum] || 25;
    for (var s = 1; s <= studentCount; s++) {
      var sd = scores[classNum] ? scores[classNum][s] : null;
      if (!sd) continue;

      var row = [s];
      App.SUBJECTS.forEach(function (subject) {
        row.push(sd[subject] || 0);
      });
      row.push(sd.total, sd.avg, sd.classRank || '-');
      data.push(row);
    }

    var ws = XLSX.utils.aoa_to_sheet(data);
    ExcelExport._setColumnWidths(ws, [6, 8, 8, 8, 8, 8, 8]);
    ExcelExport._boldHeader(ws, header.length);
    XLSX.utils.book_append_sheet(wb, ws, classNum + '반');
  };

  // ── 문항분석 시트 ──
  ExcelExport._addItemAnalysisSheet = function (wb, subject) {
    var answerKey = App.state.answerKey[subject] || [];
    var data = [];
    var header = ['문항', '정답', '유형', '전체정답률(%)'];
    App.CLASSES.forEach(function (c) { header.push(c + '반'); });
    data.push(header);

    for (var q = 0; q < App.QUESTIONS_PER_SUBJECT; q++) {
      var question = answerKey[q];
      if (!question) continue;

      var typeLabel = question.type === 'objective_single' ? '객관식' :
        (question.type === 'objective_multiple' ? '복수정답' : '서술형');

      var totalCorrect = 0;
      var totalStudents = 0;
      var classRates = {};

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
              if (answer === correctNum) { classCorrect++; totalCorrect++; }
            } else {
              if (answer === true) { classCorrect++; totalCorrect++; }
            }
          }
        }

        classRates[c] = classAnswered > 0 ? Math.round((classCorrect / classAnswered) * 100) : 0;
      });

      var totalRate = totalStudents > 0 ? Math.round((totalCorrect / totalStudents) * 100) : 0;

      var row = [question.number, question.answer, typeLabel, totalRate];
      App.CLASSES.forEach(function (c) { row.push(classRates[c]); });
      data.push(row);
    }

    var ws = XLSX.utils.aoa_to_sheet(data);
    ExcelExport._setColumnWidths(ws, [6, 20, 10, 14, 8, 8, 8, 8, 8, 8]);
    ExcelExport._boldHeader(ws, header.length);
    XLSX.utils.book_append_sheet(wb, ws, '문항분석_' + subject);
  };

  // ── 과목통계 시트 ──
  ExcelExport._addStatisticsSheet = function (wb, scores) {
    var data = [];
    var header = ['과목', '전체평균', '최고점', '최저점', '표준편차'];
    App.CLASSES.forEach(function (c) { header.push(c + '반평균'); });
    data.push(header);

    App.SUBJECTS.forEach(function (subject) {
      var allScores = [];
      var classAvgs = {};

      App.CLASSES.forEach(function (c) {
        var studentCount = App.state.studentCounts[c] || 25;
        var classTotal = 0;
        var classCount = 0;

        for (var s = 1; s <= studentCount; s++) {
          if (scores[c] && scores[c][s]) {
            var sc = scores[c][s][subject] || 0;
            allScores.push(sc);
            classTotal += sc;
            classCount++;
          }
        }

        classAvgs[c] = classCount > 0 ? Math.round((classTotal / classCount) * 10) / 10 : 0;
      });

      var totalAvg = 0;
      var maxScore = 0;
      var minScore = 100;
      var stdDev = 0;

      if (allScores.length > 0) {
        var sum = allScores.reduce(function (a, b) { return a + b; }, 0);
        totalAvg = Math.round((sum / allScores.length) * 10) / 10;
        maxScore = Math.max.apply(null, allScores);
        minScore = Math.min.apply(null, allScores);

        var variance = allScores.reduce(function (a, b) { return a + Math.pow(b - totalAvg, 2); }, 0) / allScores.length;
        stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
      }

      var row = [subject, totalAvg, maxScore, minScore, stdDev];
      App.CLASSES.forEach(function (c) { row.push(classAvgs[c]); });
      data.push(row);
    });

    // 총점 행 추가
    var allTotals = [];
    var classTotalAvgs = {};
    App.CLASSES.forEach(function (c) {
      var studentCount = App.state.studentCounts[c] || 25;
      var classTotal = 0;
      var classCount = 0;
      for (var s = 1; s <= studentCount; s++) {
        if (scores[c] && scores[c][s]) {
          allTotals.push(scores[c][s].total);
          classTotal += scores[c][s].total;
          classCount++;
        }
      }
      classTotalAvgs[c] = classCount > 0 ? Math.round((classTotal / classCount) * 10) / 10 : 0;
    });

    if (allTotals.length > 0) {
      var totalSum = allTotals.reduce(function (a, b) { return a + b; }, 0);
      var totalAvgAll = Math.round((totalSum / allTotals.length) * 10) / 10;
      var totalMax = Math.max.apply(null, allTotals);
      var totalMin = Math.min.apply(null, allTotals);
      var totalVariance = allTotals.reduce(function (a, b) { return a + Math.pow(b - totalAvgAll, 2); }, 0) / allTotals.length;
      var totalStdDev = Math.round(Math.sqrt(totalVariance) * 10) / 10;

      var totalRow = ['총점', totalAvgAll, totalMax, totalMin, totalStdDev];
      App.CLASSES.forEach(function (c) { totalRow.push(classTotalAvgs[c]); });
      data.push(totalRow);
    }

    var ws = XLSX.utils.aoa_to_sheet(data);
    ExcelExport._setColumnWidths(ws, [8, 10, 8, 8, 10, 10, 10, 10, 10, 10, 10]);
    ExcelExport._boldHeader(ws, header.length);
    XLSX.utils.book_append_sheet(wb, ws, '과목통계');
  };

  // ── 열 너비 설정 ──
  ExcelExport._setColumnWidths = function (ws, widths) {
    ws['!cols'] = widths.map(function (w) {
      return { wch: w };
    });
  };

  // ── 헤더 볼드 처리 ──
  ExcelExport._boldHeader = function (ws, colCount) {
    // SheetJS Community Edition에서는 스타일 적용이 제한적
    // Pro 버전이 아닌 경우 스타일은 무시됨
    for (var c = 0; c < colCount; c++) {
      var cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
      if (ws[cellRef]) {
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.font = { bold: true };
      }
    }
  };

  // ── 파일 다운로드 ──
  ExcelExport.download = function (workbook) {
    var now = new Date();
    var dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    var filename = '시험결과_' + dateStr + '.xlsx';

    XLSX.writeFile(workbook, filename);
  };
})();
