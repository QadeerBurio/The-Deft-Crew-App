// app/src/screens/Resume/studio/TemplateThumb.js
// P3-6: the student's own resume in one template, scaled down (the same HTML as the PDF, fonts embedded once ready;
// system fonts for the first paint).
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderResumeHTML } from '../../../services/templateService';
import { resumeHtmlWithFonts } from '../../../services/templates/print';
import { color as T } from '../../../theme/tokens';

export default function TemplateThumb({ resume, templateId, styles, width, height, interactive = false }) {
  const [html, setHtml] = useState(() => renderResumeHTML(resume, templateId, styles || resume?.customStyles || {}));
  useEffect(() => {
    let live = true;
    setHtml(renderResumeHTML(resume, templateId, styles || resume?.customStyles || {}));
    resumeHtmlWithFonts(resume, templateId, styles || resume?.customStyles || {}).then((h) => { if (live) setHtml(h); }).catch(() => {});
    return () => { live = false; };
  }, [resume, templateId, styles]);
  return (
    <View style={{ width, height, overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: T.lineSoft, backgroundColor: T.white }} pointerEvents={interactive ? 'auto' : 'none'}>
      <WebView originWhitelist={['*']} source={{ html }} scalesPageToFit scrollEnabled={interactive} style={{ width, height, backgroundColor: T.white }} />
    </View>
  );
}
