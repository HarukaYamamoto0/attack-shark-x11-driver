import * as usb from "usb";

const VID = 0x1d57;
const PID = 0xfa55;
const DEVICE_INTERFACE = 0x02;

async function diagnostic() {
    console.log("Iniciando diagnóstico...");
    const device = usb.findByIds(VID, PID);

    if (!device) {
        console.error("ERRO: Dispositivo não encontrado (VID: 0x1d57, PID: 0xfa55)");
        return;
    }

    console.log("Dispositivo encontrado.");

    try {
        device.open();
        console.log("Dispositivo aberto com sucesso.");
    } catch (err) {
        console.error("ERRO ao abrir dispositivo:", err);
        return;
    }

    try {
        const iface = device.interface(DEVICE_INTERFACE);
        console.log(`Interface ${DEVICE_INTERFACE} localizada.`);

        console.log("Tentando reivindicar (claim) a interface...");
        try {
            iface.claim();
            console.log("Interface reivindicada com sucesso!");

            console.log("Testando uma transferência de controle (GET_REPORT)...");
            // Tenta ler o Report Descriptor ou apenas um GET_REPORT básico
            device.controlTransfer(
                0x81, // Device-to-Host, Class, Interface
                0x01, // GET_REPORT
                (0x03 << 8) | 0x04, // Feature Report 4
                DEVICE_INTERFACE,
                10, // ler 10 bytes
                (err, data) => {
                    if (err) {
                        console.error("FALHA na transferência de teste:", err.message);
                        if (err.errno === -1) { // LIBUSB_ERROR_IO
                            console.log("\n--- ALERTA WINDOWS ---");
                            console.log("O erro LIBUSB_ERROR_IO indica que a comunicação foi recusada.");
                            console.log("No Windows, isso QUASE SEMPRE significa que o driver 'HID' está ativo.");
                            console.log("Para corrigir:");
                            console.log("1. Abra o Zadig.");
                            console.log("2. Vá em 'Options' -> 'List All Devices'.");
                            console.log("3. Selecione 'USB Gaming Mouse (Interface 2)'.");
                            console.log("4. Verifique se o driver atual é 'hidusb'.");
                            console.log("5. Mude para 'WinUSB' e clique em 'Replace Driver'.");
                        }
                    } else {
                        console.log("Transferência de teste bem-sucedida!", data);
                    }
                }
            );
        } catch (err: any) {
            console.error("FALHA ao reivindicar interface:", err.message);
            if (process.platform === 'win32') {
                console.log("\nDICA WINDOWS: Se você receber 'LIBUSB_ERROR_ACCESS' ou 'Entity not found',");
                console.log("isso geralmente significa que o driver HID padrão do Windows está bloqueando o acesso.");
                console.log("Use o Zadig (https://zadig.akeo.ie/) para trocar o driver da Interface 2 para WinUSB.");
            }
        }

        iface.release(true, (err) => {
            if (err) console.error("Erro ao liberar interface:", err);
            else console.log("Interface liberada.");
            device.close();
            console.log("Dispositivo fechado.");
        });

    } catch (err) {
        console.error("Erro inesperado durante o diagnóstico:", err);
        device.close();
    }
}

diagnostic();
