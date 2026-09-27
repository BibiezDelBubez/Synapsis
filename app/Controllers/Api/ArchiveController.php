<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\CaseArchive;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Dossier;
use App\Core\Request;
use App\Core\Response;
use App\Core\Settings;

/**
 * Dossier e backup.
 *   GET  /api/dossier?sections=a,b      → { markdown, sections } del caso aperto
 *   GET  /api/backup/case               → download JSON del caso aperto (dati + immagini)
 *   POST /api/backup/case               → ripristina un backup JSON come NUOVO caso (multipart "file" o corpo JSON)
 *   GET  /api/backup/database           → download dell'intero database SQLite
 *   POST /api/uploads/cleanup           → elimina le immagini del caso aperto non più usate
 */
final class ArchiveController extends Controller
{
    public function dossier(): array
    {
        $sections = array_filter(explode(',', (string) ($this->request->query['sections'] ?? '')));
        return [
            'markdown' => (new Dossier($this->caseId(), Request::basePath()))->markdown($sections),
            'sections' => Dossier::SECTIONS,
        ];
    }

    public function exportCase(): Response
    {
        $data = CaseArchive::export($this->caseId());
        $name = 'sinapsi-' . $this->slug((string) $data['case']['title']) . '-' . date('Ymd-Hi') . '.json';
        return new Response(
            (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            200,
            ['Content-Type' => 'application/json; charset=utf-8', 'Content-Disposition' => 'attachment; filename="' . $name . '"', 'Cache-Control' => 'no-store']
        );
    }

    public function importCase(): array
    {
        if (isset($_FILES['file']) && is_string($_FILES['file']['tmp_name'] ?? null) && ($_FILES['file']['error'] ?? 1) === UPLOAD_ERR_OK) {
            $data = json_decode((string) file_get_contents($_FILES['file']['tmp_name']), true);
        } else {
            $data = $this->request->json();
        }
        if (!is_array($data)) {
            $this->abort(422, 'Il file non è un JSON valido.');
        }
        return CaseArchive::import($data);
    }

    public function exportDatabase(): Response
    {
        if (Database::driver() !== 'sqlite') {
            $this->abort(422, 'Con MySQL usa gli strumenti del server (es. mysqldump o phpMyAdmin).');
        }
        $tmp = tempnam(sys_get_temp_dir(), 'sinapsi');
        @unlink($tmp); // VACUUM INTO richiede che il file non esista
        Database::execute('VACUUM INTO ?', [$tmp]);
        $body = (string) file_get_contents($tmp);
        @unlink($tmp);
        return new Response($body, 200, [
            'Content-Type'        => 'application/vnd.sqlite3',
            'Content-Disposition' => 'attachment; filename="sinapsi-' . date('Ymd-Hi') . '.sqlite"',
            'Cache-Control'       => 'no-store',
        ]);
    }

    public function cleanupUploads(): array
    {
        return ['removed' => CaseArchive::cleanupUploads($this->caseId())];
    }

    private function caseId(): int
    {
        $id = Settings::activeCaseId();
        if ($id === null) {
            $this->abort(409, 'Apri un caso.');
        }
        return $id;
    }

    private function slug(string $text): string
    {
        $slug = strtolower((string) preg_replace('/[^A-Za-z0-9]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text));
        return trim($slug, '-') ?: 'caso';
    }
}
