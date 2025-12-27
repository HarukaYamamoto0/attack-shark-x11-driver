#!/usr/bin/env python3
"""
Attack Shark X11 Linux Driver - WORKING VERSION
Protocolo reverse engineered via captura USB Windows
"""

import usb.core
import usb.util
import sys

VENDOR_ID = 0x1d57
PRODUCT_ID = 0xfa55
INTERFACE = 2

# Mapeamento DPI por stage
DPI_MAP = {
    1: 800,
    2: 1600,
    3: 2400,
    4: 3200,
    5: 5000,
    6: 22000
}

class AttackSharkX11:
    def __init__(self):
        self.dev = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
        if self.dev is None:
            raise ValueError("❌ Mouse Attack Shark X11 não encontrado!")
        
        if self.dev.is_kernel_driver_active(INTERFACE):
            self.dev.detach_kernel_driver(INTERFACE)
        
        # Estado atual das configurações
        self.angle_snap = True  # padrão ON
        self.ripple_control = True  # padrão ON
        
        print(f"✓ Mouse conectado")
    
    def set_dpi_stage(self, stage):
        """
        Troca para o stage de DPI (1-6)
        Baseado no protocolo capturado do software Windows oficial
        """
        if stage < 1 or stage > 6:
            raise ValueError("Stage deve ser entre 1 e 6")
        
        # Payload completo do Report 0x04 (52 bytes)
        # Estrutura descoberta via reverse engineering:
        # Byte 2: Angle Snap (0x00=OFF, 0x01=ON)
        # Byte 3: Ripple Control (0x00=OFF, 0x01=ON)
        # Byte 24: DPI Stage (1-6)
        
        angle_snap_byte = 0x01 if self.angle_snap else 0x00
        ripple_byte = 0x01 if self.ripple_control else 0x00
        
        payload = bytearray([
            0x04, 0x38,
            angle_snap_byte,  # Byte 2: Angle Snap
            ripple_byte,      # Byte 3: Ripple Control
            0x01, 0x3f, 0x20, 0x20,
            0x12, 0x25, 0x38, 0x4b, 0x75, 0x81, 0x01, 0x01,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
            stage,  # Byte 24: DPI stage
            0xff, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00,
            0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff,
            0xff, 0x00, 0xff, 0xff, 0x40, 0x00, 0xff, 0xff,
            0xff, 0x02, 0x0f,
            0x68 + stage  # Checksum
        ])
        
        try:
            result = self.dev.ctrl_transfer(
                bmRequestType=0x21,
                bRequest=0x09,
                wValue=0x0304,
                wIndex=INTERFACE,
                data_or_wLength=bytes(payload)
            )
            
            dpi = DPI_MAP[stage]
            print(f"✓ DPI alterado para Stage {stage} ({dpi} DPI)")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao alterar DPI: {e}")
            return False
    
    def set_polling_rate(self, rate_hz):
        """
        Define polling rate (125, 250, 500, 1000 Hz)
        """
        rate_map = {
            125: (0x08, 0xf7),
            250: (0x04, 0xfb),
            500: (0x02, 0xfd),
            1000: (0x01, 0xfe)
        }
        
        if rate_hz not in rate_map:
            raise ValueError(f"Polling rate deve ser: 125, 250, 500 ou 1000 Hz")
        
        value, checksum = rate_map[rate_hz]
        
        # Report 0x06 (9 bytes)
        payload = bytes([0x06, 0x09, 0x01, value, checksum, 0x00, 0x00, 0x00, 0x00])
        
        try:
            result = self.dev.ctrl_transfer(
                bmRequestType=0x21,
                bRequest=0x09,
                wValue=0x0306,  # Feature Report ID 0x06
                wIndex=INTERFACE,
                data_or_wLength=payload
            )
            
            print(f"✓ Polling rate alterado para {rate_hz}Hz")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao alterar polling rate: {e}")
            return False
    
    def set_debounce(self, milliseconds):
        """
        Define key response time / debounce (4-50ms, steps de 2ms)
        """
        if milliseconds < 4 or milliseconds > 50 or (milliseconds - 4) % 2 != 0:
            raise ValueError("Debounce deve ser entre 4-50ms em steps de 2ms (4, 6, 8, ... 50)")
        
        # Fórmula: (ms - 4) / 2 + 2
        value = ((milliseconds - 4) // 2) + 2
        
        # Checksum: soma simples com offset
        checksum = 0xab + value
        
        # Report 0x05 (13 bytes) - modo debounce
        payload = bytes([
            0x05, 0x0f, 0x01, 0x00, 0x03, 0xa8, 0x00, 0xff,
            0x00, 0x01, value, 0x01, checksum & 0xFF
        ])
        
        try:
            self.dev.ctrl_transfer(
                bmRequestType=0x21,
                bRequest=0x09,
                wValue=0x0305,
                wIndex=INTERFACE,
                data_or_wLength=payload
            )
            print(f"✓ Debounce (Key Response Time) alterado para {milliseconds}ms")
            return True
        except Exception as e:
            print(f"❌ Erro ao alterar debounce: {e}")
            return False
    
    def set_sleep_time(self, seconds):
        """
        Define tempo até entrar em sleep mode
        Range: 50-1800 segundos (0.83-30 min), steps de 50 segundos
        """
        if seconds < 50 or seconds > 1800 or seconds % 50 != 0:
            raise ValueError("Sleep deve ser 50-1800 segundos em steps de 50s (50, 100, 150...1800)")
        
        # Converte segundos pra minutos fracionários (0.5min = 30s)
        # Baseado nos dados: 0.5min=30s tinha value 0x01
        # 1.5min=90s tinha value 0x03
        # 30min=1800s tinha value 0x3c
        # Parece ser: value = segundos / 30
        value = seconds // 30
        
        # Checksum observado: incrementa conforme value
        checksum = (0xce + value) & 0xFF
        
        payload = bytes([
            0x05, 0x0f, 0x01, 0x00, 0x03, 0xc8, 0x00, 0xff,
            0x00, value, 0x04, 0x01, checksum
        ])
        
        try:
            self.dev.ctrl_transfer(
                bmRequestType=0x21,
                bRequest=0x09,
                wValue=0x0305,
                wIndex=INTERFACE,
                data_or_wLength=payload
            )
            minutes = seconds / 60
            print(f"✓ Sleep time configurado para {seconds}s ({minutes:.1f} min)")
            return True
        except Exception as e:
            print(f"❌ Erro ao configurar sleep: {e}")
            return False
    
    def set_deep_sleep_time(self, minutes):
        """
        Define tempo até entrar em deep sleep
        Range: 1-60 minutos, steps de 1 minuto
        """
        if minutes < 1 or minutes > 60:
            raise ValueError("Deep sleep deve ser entre 1 e 60 minutos")
        
        # Fórmula descoberta via reverse engineering:
        # byte4 = (minutos // 20) * 0x10 + 0x03
        # byte5 = (minutos % 20) * 8 + 0x18  
        # checksum = byte5 + 0x07
        
        byte4 = ((minutes // 20) * 0x10) + 0x03
        byte5 = ((minutes % 20) * 8) + 0x18
        checksum = (byte5 + 0x07) & 0xFF
        
        payload = bytes([
            0x05, 0x0f, 0x01, 0x00, byte4,
            byte5, 0x00, 0xff, 0x00, 0x01, 0x04, 0x01, checksum
        ])
        
        try:
            self.dev.ctrl_transfer(
                bmRequestType=0x21,
                bRequest=0x09,
                wValue=0x0305,
                wIndex=INTERFACE,
                data_or_wLength=payload
            )
            print(f"✓ Deep sleep configurado para {minutes} minutos")
            return True
        except Exception as e:
            print(f"❌ Erro ao configurar deep sleep: {e}")
            return False
        """
        Ativa/desativa Angle Snap (suavização de linha reta)
        """
        self.angle_snap = enabled
        # Reaplicar com DPI stage atual (assume stage 2 = 1600 como padrão)
        current_stage = self.get_current_stage() or 2
        self.set_dpi_stage(current_stage)
        status = "ON" if enabled else "OFF"
        print(f"✓ Angle Snap: {status}")
        return True
    
    def set_ripple_control(self, enabled):
        """
        Ativa/desativa Ripple Control
        """
        self.ripple_control = enabled
        # Reaplicar com DPI stage atual
        current_stage = self.get_current_stage() or 2
        self.set_dpi_stage(current_stage)
        status = "ON" if enabled else "OFF"
        print(f"✓ Ripple Control: {status}")
        return True
    
    def get_current_stage(self):
        """Lê o stage atual do mouse via endpoint 0x83"""
        try:
            endpoint = self.dev[0][(INTERFACE, 0)][0]
            data = endpoint.read(16, timeout=500)
            hex_data = data.tobytes().hex()
            
            # Formato: 0355[MODE][STAGE]64
            # MODE: 40=normal, 10=transitório
            if len(hex_data) >= 10:
                stage_byte = hex_data[6:8]  # Byte 3
                try:
                    stage = int(stage_byte, 16)
                    if 1 <= stage <= 6:
                        return stage
                except:
                    pass
            return None
        except:
            return None
    
    def close(self):
        """Libera recursos USB"""
        usb.util.dispose_resources(self.dev)


def main():
    if len(sys.argv) < 2:
        print("""
╔═══════════════════════════════════════════════════════════╗
║     Attack Shark X11 - Linux Driver (WORKING!)           ║
╚═══════════════════════════════════════════════════════════╝

Uso:
  sudo python3 attackshark_driver.py <stage>
  sudo python3 attackshark_driver.py polling <hz>
  sudo python3 attackshark_driver.py debounce <ms>
  sudo python3 attackshark_driver.py sleep <seconds>
  sudo python3 attackshark_driver.py deepsleep <minutes>
  sudo python3 attackshark_driver.py anglesnap <on|off>
  sudo python3 attackshark_driver.py ripple <on|off>
  sudo python3 attackshark_driver.py status

Configurações disponíveis:
  DPI Stages: 1-6 (800, 1600, 2400, 3200, 5000, 22000 DPI)
  Polling Rate: 125, 250, 500, 1000 Hz
  Debounce (Key Response): 4-50ms (steps de 2ms)
  Sleep Time: 50-1800 segundos (steps de 50s)
  Deep Sleep Time: 1-60 minutos (steps de 1min)

Exemplos:
  sudo python3 attackshark_driver.py 2              # 1600 DPI
  sudo python3 attackshark_driver.py polling 1000   # 1000Hz
  sudo python3 attackshark_driver.py debounce 8     # 8ms response
  sudo python3 attackshark_driver.py sleep 300      # Sleep após 300s (5min)
  sudo python3 attackshark_driver.py deepsleep 30   # Deep sleep 30min
  sudo python3 attackshark_driver.py anglesnap off  # Desativa
  sudo python3 attackshark_driver.py status         # Status atual
""")
        return
    
    try:
        mouse = AttackSharkX11()
        
        command = sys.argv[1].lower()
        
        if command == "status":
            stage = mouse.get_current_stage()
            if stage:
                dpi = DPI_MAP[stage]
                print(f"📊 Stage atual: {stage} ({dpi} DPI)")
            else:
                print("❌ Não foi possível ler o stage atual")
        
        elif command == "polling" and len(sys.argv) >= 3:
            rate = int(sys.argv[2])
            mouse.set_polling_rate(rate)
            print("\n🖱️  Teste o mouse agora!")
        
        elif command == "anglesnap" and len(sys.argv) >= 3:
            enabled = sys.argv[2].lower() == "on"
            mouse.set_angle_snap(enabled)
            print("\n🖱️  Configuração aplicada!")
        
        elif command == "ripple" and len(sys.argv) >= 3:
            enabled = sys.argv[2].lower() == "on"
            mouse.set_ripple_control(enabled)
            print("\n🖱️  Configuração aplicada!")
        
        elif command == "debounce" and len(sys.argv) >= 3:
            ms = int(sys.argv[2])
            mouse.set_debounce(ms)
            print("\n🖱️  Configuração aplicada!")
        
        elif command == "sleep" and len(sys.argv) >= 3:
            seconds = int(sys.argv[2])
            mouse.set_sleep_time(seconds)
            print("\n💤 Sleep configurado!")
        
        elif command == "deepsleep" and len(sys.argv) >= 3:
            minutes = int(sys.argv[2])
            mouse.set_deep_sleep_time(minutes)
            print("\n💤 Deep sleep configurado!")
        
        elif command.isdigit():
            stage = int(command)
            if 1 <= stage <= 6:
                mouse.set_dpi_stage(stage)
                print("\n🖱️  Teste o mouse agora!")
            else:
                print("❌ Stage deve ser entre 1 e 6")
        
        else:
            print(f"❌ Comando '{command}' inválido")
        
        mouse.close()
    
    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
