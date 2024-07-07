"use client"

import React from 'react';
import Modal from 'react-modal';

interface ModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  content: React.ReactNode;
}

const CustomModal: React.FC<ModalProps> = ({ isOpen, onRequestClose, content }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Item Details"
      className="fixed inset-0 bg-white p-4"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      ariaHideApp={false}
    >
      {content}
    </Modal>
  );
};

export default CustomModal;
