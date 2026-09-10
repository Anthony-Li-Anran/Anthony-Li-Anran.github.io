/* ==========================================================================
   i18n (Internationalization) Engine - Client-side language switching
   ========================================================================== */

var I18N = (function() {
  'use strict';

  var _currentLang = (function() {
    var saved = localStorage.getItem('lang');
    return (saved === 'zh' || saved === 'en') ? saved : 'en';
  })();

  function _getNested(obj, path) {
    return path.split('.').reduce(function(current, key) {
      return (current && current[key] !== undefined) ? current[key] : null;
    }, obj);
  }

  function _applyTranslations(lang) {
    var translations = window.I18N_DATA && window.I18N_DATA[lang];
    if (!translations) return;

    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var value = _getNested(translations, key);
      if (value) {
        var attr = el.getAttribute('data-i18n-attr');
        if (attr) {
          el.setAttribute(attr, value);
        } else {
          el.textContent = value;
        }
      }
    });

    // Update html lang attribute
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  }

  function _updateToggleUI() {
    var icon = document.getElementById('lang-icon');
    if (icon) {
      icon.textContent = _currentLang === 'zh' ? 'En/中' : '中/En';
    }
  }

  function init() {
    _applyTranslations(_currentLang);
    _updateToggleUI();

    // Handle toggle click
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        _currentLang = _currentLang === 'en' ? 'zh' : 'en';
        localStorage.setItem('lang', _currentLang);
        _applyTranslations(_currentLang);
        _updateToggleUI();
      });
    }
  }

  function getLang() {
    return _currentLang;
  }

  return {
    init: init,
    getLang: getLang
  };
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { I18N.init(); });
} else {
  I18N.init();
}
