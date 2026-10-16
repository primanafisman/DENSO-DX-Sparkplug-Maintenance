"""Create local camera TLS identities without installing trust or contacting a CA."""
import argparse
import ipaddress
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def write_file(path, contents, private=False):
    temporary = path.with_suffix(path.suffix + '.tmp')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600 if private else 0o644)
    with os.fdopen(descriptor, 'wb') as stream:
        stream.write(contents)
    os.replace(temporary, path)
    if private:
        os.chmod(path, 0o600)


def private_bytes(key):
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())


def generate(directory, addresses):
    addresses = sorted({ipaddress.ip_address('127.0.0.1'), *(ipaddress.ip_address(value) for value in addresses)}, key=str)
    if any(not (address.is_private or address.is_loopback) or address.is_unspecified or address.is_multicast for address in addresses):
        raise ValueError('Use private LAN or loopback IP addresses only.')
    directory.mkdir(parents=True, exist_ok=True)
    ca_path, ca_key_path = directory / 'ca-cert.pem', directory / 'ca-key.pem'
    now = datetime.now(timezone.utc)
    if ca_path.exists() != ca_key_path.exists():
        raise ValueError('The existing CA pair is incomplete. Restore its matching certificate and private key.')
    if ca_path.exists():
        ca = x509.load_pem_x509_certificate(ca_path.read_bytes())
        ca_key = serialization.load_pem_private_key(ca_key_path.read_bytes(), password=None)
        if (not ca.extensions.get_extension_for_class(x509.BasicConstraints).value.ca
                or ca.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
                != ca_key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
                or ca.not_valid_after_utc < now + timedelta(days=366)):
            raise ValueError('Existing CA is invalid, mismatched, or needs renewal. Preserve the files and review local camera setup.')
    else:
        ca_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Sparkplug Maintenance Local Camera CA')])
        ca = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(ca_key.public_key())
              .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(minutes=5))
              .not_valid_after(now + timedelta(days=3650))
              .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
              .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=False, key_encipherment=False,
                                          data_encipherment=False, key_agreement=False, key_cert_sign=True,
                                          crl_sign=True, encipher_only=False, decipher_only=False), critical=True)
              .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
              .sign(ca_key, hashes.SHA256()))
        write_file(ca_key_path, private_bytes(ca_key), private=True)
        write_file(ca_path, ca.public_bytes(serialization.Encoding.PEM))
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server = (x509.CertificateBuilder()
              .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Sparkplug Maintenance Local Camera')]))
              .issuer_name(ca.subject).public_key(server_key.public_key())
              .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(minutes=5))
              .not_valid_after(now + timedelta(days=365))
              .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
              .add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'), *[x509.IPAddress(address) for address in addresses]]), critical=False)
              .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
              .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=False, key_encipherment=True,
                                          data_encipherment=False, key_agreement=False, key_cert_sign=False,
                                          crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
              .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
              .sign(ca_key, hashes.SHA256()))
    write_file(directory / 'server-key.pem', private_bytes(server_key), private=True)
    write_file(directory / 'server-cert.pem', server.public_bytes(serialization.Encoding.PEM))
    # A DER public certificate is convenient for the phone's certificate installer.
    write_file(directory / 'camera-ca.cer', ca.public_bytes(serialization.Encoding.DER))
    print('Camera certificate ready for localhost and ' + ', '.join(str(address) for address in addresses))
    print('Public CA SHA-256: ' + ca.fingerprint(hashes.SHA256()).hex(':'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--ip', action='append', default=[])
    args = parser.parse_args()
    try:
        generate(args.directory, args.ip)
    except (ValueError, OSError) as error:
        parser.exit(1, 'Camera certificate setup failed: ' + str(error) + '\n')
