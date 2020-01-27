declare type FileAvailabilitiesState = Record<
  FileMetadata['type'],
  Record<FileId, StoredFileAvailability>
>

declare type FileAvailability =
  | CurrentlyLoadedFile
  | NotCurrentlyLoadedFile
  | NeverLoadedFile
  | NotFoundFile

declare type StoredFileAvailability =
  | CurrentlyLoadedFile
  | NotCurrentlyLoadedFile

declare type CurrentlyLoadedFile = {
  id: FileId
  status: 'CURRENTLY_LOADED'
  filePath: FilePath
}
declare type NotCurrentlyLoadedFile = {
  id: FileId
  status: 'REMEMBERED'
  filePath: FilePath
}
declare type NeverLoadedFile = {
  id: FileId
  status: 'NOT_LOADED'
  filePath: null
}
declare type NotFoundFile = {
  id: FileId
  status: 'NOT_FOUND'
  filePath: null
}

declare type FileWithAvailability<F extends FileMetadata> =
  | {
      file: F
      availability: StoredFileAvailability | NeverLoadedFile
    }
  | {
      file: null
      availability: NotFoundFile
    }
