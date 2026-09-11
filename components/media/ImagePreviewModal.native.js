import React from 'react';
import ImageView from 'react-native-image-viewing';

export default function ImagePreviewModal({ visible, images, onRequestClose }) {
  return (
    <ImageView
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onRequestClose}
      swipeToCloseEnabled
      doubleTapToZoomEnabled
    />
  );
}