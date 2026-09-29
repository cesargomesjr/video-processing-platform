import {
  ExtractFramesSpec,
  InvalidExtractFramesSpecError,
} from '../../../src/contexts/video-processing/domain/extract-frames-spec';

describe('ExtractFramesSpec', () => {
  it('extracts one frame per second', () => {
    expect(ExtractFramesSpec.FPS).toBe(1);
  });

  it('derives the start number from the floor of startSeconds', () => {
    expect(ExtractFramesSpec.create(12.7).startNumber).toBe(12);
    expect(ExtractFramesSpec.create(12).startNumber).toBe(12);
  });

  it('produces deterministic and lexicographically sortable names', () => {
    const spec = ExtractFramesSpec.create(9);

    expect(spec.frameName(0)).toBe('frame_000000.png');
    expect(spec.frameName(9)).toBe('frame_000009.png');
    expect(spec.frameName(10)).toBe('frame_000010.png');
  });

  it('rejects negative start seconds', () => {
    expect(() => ExtractFramesSpec.create(-1)).toThrow(InvalidExtractFramesSpecError);
  });
});
