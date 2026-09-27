<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Controller;
use App\Core\Settings;
use App\Core\Upload;

/**
 * Caricamento immagini per i campi di tipo image.
 *   POST /api/uploads   (multipart/form-data, campo "file") → { path, width, height }
 * Il file va nella cartella del caso aperto; il percorso restituito si salva poi nel record.
 */
final class UploadController extends Controller
{
    public function store(): array
    {
        $caseId = Settings::activeCaseId();
        if ($caseId === null) {
            $this->abort(409, 'Apri un caso prima di caricare immagini.');
        }
        if (!isset($_FILES['file']) || is_array($_FILES['file']['error'])) {
            $this->abort(422, 'Nessun file ricevuto (il file supera post_max_size?).');
        }
        return Upload::storeImage($_FILES['file'], $caseId);
    }
}
