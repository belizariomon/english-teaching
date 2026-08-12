import { useRef, useState } from 'react';
type UseRecorderResult = {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
};
export function useRecorder(): UseRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };
  const getSupportedMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];
    return (
      candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ??
      ''
    );
  };
  const startRecording = async (): Promise<void> => {
    setError(null);
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('El navegador no permite acceder al micrófono.');
      }
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('El navegador no soporta grabación de audio.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError('Ocurrió un error durante la grabación.');
        cleanup();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      cleanup();
      if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError')
      ) {
        setError(
          'No se permitió el acceso al micrófono. Verifica los permisos del navegador.',
        );
        return;
      }
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar la grabación.',
      );
    }
  };
  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('No hay una grabación activa.'));
        return;
      }
      const mimeType = recorder.mimeType || 'audio/webm';
      const handleStop = () => {
        const chunks = chunksRef.current;
        if (!chunks.length) {
          cleanup();
          reject(new Error('La grabación no contiene datos de audio.'));
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        cleanup();
        chunksRef.current = [];
        if (!blob.size) {
          reject(new Error('La grabación de audio está vacía.'));
          return;
        }
        resolve(blob);
      };
      recorder.addEventListener('stop', handleStop, { once: true });
      recorder.stop();
    });
  };
  return { isRecording, startRecording, stopRecording, error };
}
